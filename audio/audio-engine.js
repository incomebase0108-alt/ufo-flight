/* =============================================================================
 * UFO地球侵略ゲーム — オーディオエンジン（4号機担当 / BGM＆効果音）
 * Web Audio API で BGM・効果音を「完全プロシージャル生成」する。外部音源ファイル不要。
 * 依存なし（Three.js とも無関係）。グローバル `window.AudioEngine` を1つ生やすだけ。
 *
 * -----------------------------------------------------------------------------
 * ◆ 統合ガイド（1号機向け・index.html への組み込み方）
 * -----------------------------------------------------------------------------
 * 1) 読み込み: <body> 末尾、ゲーム本体 <script> より前に1行追加
 *      <script src="audio/audio-engine.js"></script>
 *    （single-HTML 配布なら、このファイル全文を <script>…</script> で内部にコピペでもOK）
 *
 * 2) 起動: ブラウザは「ユーザー操作後」でないと音を鳴らせない。最初のクリック/キー入力/
 *    スタートボタンで一度だけ次を呼ぶ（it's idempotent。2回目以降は無視される）:
 *      AudioEngine.init();              // AudioContext 生成
 *      AudioEngine.playBGM('normal');   // 通常BGM開始
 *    例) document.addEventListener('pointerdown', () => AudioEngine.init(), { once:true });
 *
 * 3) BGM切替（ミッション/ボス戦）:
 *      ボス出現時          → AudioEngine.playBGM('boss');
 *      ボス撃破/通常へ復帰 → AudioEngine.playBGM('normal');
 *      ゲームオーバー/停止 → AudioEngine.stopBGM();
 *    （同じトラックを再指定しても二重再生しない。クロスフェードで自然に切替）
 *
 * 4) 効果音（イベント発生箇所で1行呼ぶだけ。多重発音OK・自動でボイス上限管理）:
 *      弾を撃った          → AudioEngine.sfx.shoot();
 *      敵/建物が爆発        → AudioEngine.sfx.explosion();
 *      プレイヤー被弾       → AudioEngine.sfx.hit();
 *      警告（領空侵犯/低HP）→ AudioEngine.sfx.alert();
 *      アイテム取得         → AudioEngine.sfx.item();
 *      ミッション達成       → AudioEngine.sfx.missionClear();
 *
 * 5) 音量・ミュート（任意。UI ボタンに割り当て可）:
 *      AudioEngine.setMasterVolume(0..1);  AudioEngine.setBgmVolume(0..1);  AudioEngine.setSfxVolume(0..1);
 *      AudioEngine.toggleMute();           // 戻り値: ミュート状態(bool)
 *      AudioEngine.isReady();              // init 済みか
 *
 * 6) タブ非アクティブで自動 suspend する環境向けに、復帰フックを内蔵済み
 *    （visibilitychange で resume）。特別な対応は不要。
 * ============================================================================= */
(function (global) {
  'use strict';

  // ---- 内部状態 -------------------------------------------------------------
  var ctx = null;            // AudioContext
  var master, bgmBus, sfxBus; // GainNode（バス）
  var muted = false;
  var vol = { master: 0.65, bgm: 0.45, sfx: 0.9 }; // 既定音量

  // ---- ユーティリティ -------------------------------------------------------
  // ノート名(例 'A3','C#4') or MIDI番号 → 周波数(Hz)。A4=440Hz 基準。
  var NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
                   'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function midi(note) {
    if (typeof note === 'number') return note;
    var m = /^([A-G][#b]?)(-?\d)$/.exec(note);
    if (!m) return 69;
    return NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12; // MIDI: C-1=0, A4=69
  }
  function hz(note) { return 440 * Math.pow(2, (midi(note) - 69) / 12); }

  // ホワイトノイズの AudioBuffer（爆発・被弾用）。生成は1回だけキャッシュ。
  var _noiseBuf = null;
  function noiseBuffer() {
    if (_noiseBuf) return _noiseBuf;
    var len = ctx.sampleRate * 1.0;
    _noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = _noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return _noiseBuf;
  }

  // 単音（オシレータ＋ADSR的エンベロープ）。SE/BGM 共通の基本ボイス。
  // opt: {type, freq, t0, dur, attack, release, peak, glideTo, dest, detune}
  function tone(opt) {
    var t0 = opt.t0 != null ? opt.t0 : ctx.currentTime;
    var dur = opt.dur != null ? opt.dur : 0.2;
    var atk = opt.attack != null ? opt.attack : 0.005;
    var rel = opt.release != null ? opt.release : 0.06;
    var peak = opt.peak != null ? opt.peak : 0.5;
    var osc = ctx.createOscillator();
    osc.type = opt.type || 'square';
    osc.frequency.setValueAtTime(opt.freq, t0);
    if (opt.glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.glideTo), t0 + dur);
    if (opt.detune) osc.detune.setValueAtTime(opt.detune, t0);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);            // attack
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);    // decay+release
    osc.connect(g); g.connect(opt.dest || sfxBus);
    osc.start(t0); osc.stop(t0 + dur + rel + 0.02);
    return osc;
  }

  // ノイズ一発（バンドパス/ローパス付き）。爆発・被弾・着弾用。
  // opt: {t0, dur, peak, type('lowpass'|'highpass'|'bandpass'), freq, q, glideTo, dest}
  function noise(opt) {
    var t0 = opt.t0 != null ? opt.t0 : ctx.currentTime;
    var dur = opt.dur != null ? opt.dur : 0.3;
    var peak = opt.peak != null ? opt.peak : 0.6;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    var f = ctx.createBiquadFilter();
    f.type = opt.type || 'lowpass';
    f.frequency.setValueAtTime(opt.freq != null ? opt.freq : 1000, t0);
    if (opt.glideTo != null) f.frequency.exponentialRampToValueAtTime(Math.max(20, opt.glideTo), t0 + dur);
    if (opt.q != null) f.Q.value = opt.q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(opt.dest || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.02);
    return src;
  }

  // =========================================================================
  // 初期化 / バス構成
  // =========================================================================
  function init() {
    if (ctx) { resume(); return true; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { console.warn('[AudioEngine] Web Audio API 非対応ブラウザ'); return false; }
    ctx = new AC();
    master = ctx.createGain();
    bgmBus = ctx.createGain();
    sfxBus = ctx.createGain();
    applyVolumes();
    bgmBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    // タブ復帰時に suspend されていたら再開
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) resume();
      });
    }
    resume();
    return true;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function unlock() { init(); resume(); } // 別名（初回ユーザー操作用）
  function isReady() { return !!ctx; }

  function applyVolumes() {
    if (!ctx) return;
    var t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : vol.master, t, 0.02);
    bgmBus.gain.setTargetAtTime(vol.bgm, t, 0.02);
    sfxBus.gain.setTargetAtTime(vol.sfx, t, 0.02);
  }
  function setMasterVolume(v) { vol.master = clamp01(v); applyVolumes(); }
  function setBgmVolume(v) { vol.bgm = clamp01(v); applyVolumes(); }
  function setSfxVolume(v) { vol.sfx = clamp01(v); applyVolumes(); }
  function toggleMute() { muted = !muted; applyVolumes(); return muted; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  // =========================================================================
  // 効果音（SE）
  // =========================================================================
  var sfx = {
    // 発射: 高→低へ素早く下降する「ピュン」レーザー。
    shoot: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      tone({ type: 'square', freq: 880, glideTo: 180, t0: t, dur: 0.12, attack: 0.002, release: 0.04, peak: 0.35 });
      tone({ type: 'sawtooth', freq: 1320, glideTo: 240, t0: t, dur: 0.10, attack: 0.002, release: 0.03, peak: 0.15 });
    },
    // 爆発: 低い「ドン」＋ノイズ崩壊。建物・敵機の撃破に。
    explosion: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      noise({ t0: t, dur: 0.55, peak: 0.8, type: 'lowpass', freq: 1800, glideTo: 120, q: 1 });
      tone({ type: 'sine', freq: 140, glideTo: 42, t0: t, dur: 0.45, attack: 0.004, release: 0.1, peak: 0.7 });
      tone({ type: 'triangle', freq: 90, glideTo: 30, t0: t + 0.02, dur: 0.4, attack: 0.004, release: 0.1, peak: 0.4 });
    },
    // 被弾: プレイヤーがダメージ。鋭い金属的ヒット＋下降ノイズ。
    hit: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      tone({ type: 'square', freq: 320, glideTo: 90, t0: t, dur: 0.18, attack: 0.001, release: 0.05, peak: 0.45 });
      noise({ t0: t, dur: 0.22, peak: 0.5, type: 'bandpass', freq: 1200, glideTo: 300, q: 0.8 });
    },
    // 警告アラート: 領空侵犯・低HP等。2音の反復ビープ（緊迫感）。
    alert: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      for (var i = 0; i < 3; i++) {
        var tt = t + i * 0.18;
        tone({ type: 'square', freq: i % 2 ? 660 : 990, t0: tt, dur: 0.1, attack: 0.003, release: 0.03, peak: 0.3 });
      }
    },
    // アイテム取得: 明るい上昇アルペジオ「キラッ」。
    item: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      var notes = ['C5', 'E5', 'G5', 'C6'];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'triangle', freq: hz(notes[i]), t0: t + i * 0.05, dur: 0.12, attack: 0.003, release: 0.06, peak: 0.32 });
      }
    },
    // ミッション達成: ファンファーレ（上昇＋メジャーコード）。少し長め・華やか。
    missionClear: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      var seq = [['C5', 0.0], ['E5', 0.12], ['G5', 0.24], ['C6', 0.36]];
      for (var i = 0; i < seq.length; i++) {
        tone({ type: 'square', freq: hz(seq[i][0]), t0: t + seq[i][1], dur: 0.16, attack: 0.004, release: 0.08, peak: 0.3 });
        tone({ type: 'triangle', freq: hz(seq[i][0]) / 2, t0: t + seq[i][1], dur: 0.16, attack: 0.004, release: 0.08, peak: 0.18 });
      }
      // 末尾の和音（C メジャー）を伸ばす
      var ch = ['C6', 'E6', 'G6'];
      for (var j = 0; j < ch.length; j++) {
        tone({ type: 'triangle', freq: hz(ch[j]), t0: t + 0.5, dur: 0.55, attack: 0.01, release: 0.2, peak: 0.22 });
      }
    }
  };

  // =========================================================================
  // BGM（ルックアヘッド・スケジューラでドリフトなしのループ再生）
  // =========================================================================
  // トラック定義: 16分音符グリッド。bass/lead は step 配列（null=休符）。
  // 通常曲: A マイナー系の駆動感あるループ。ボス曲: 速く・低く・不協で緊迫。
  var TRACKS = {
    normal: {
      tempo: 124, steps: 16,
      bass: ['A1', null, null, null, 'A1', null, 'G1', null, 'F1', null, null, null, 'E1', null, 'E1', null],
      lead: ['A3', null, 'C4', 'E4', null, 'C4', 'A3', null, 'F3', null, 'A3', 'C4', null, 'E4', 'D4', 'C4'],
      leadType: 'triangle', bassType: 'sawtooth', leadGain: 0.18, bassGain: 0.32
    },
    boss: {
      tempo: 158, steps: 16,
      bass: ['D1', 'D1', null, 'D1', 'D1', null, 'D#1', null, 'C1', 'C1', null, 'C1', 'E1', null, 'F1', 'F#1'],
      lead: ['D4', 'A3', 'D4', 'F4', 'E4', 'A3', 'D4', 'F4', 'C4', 'G3', 'C4', 'D#4', 'E4', 'F4', 'F#4', 'A4'],
      leadType: 'square', bassType: 'sawtooth', leadGain: 0.2, bassGain: 0.36
    }
  };

  var sched = {
    running: false, timer: null, current: null,
    step: 0, nextTime: 0,
    lookahead: 0.12, // s 先まで予約
    tickMs: 25
  };

  function stepDur(track) { return (60 / track.tempo) / 4; } // 16分音符長(s)

  function scheduleStep(track, step, when) {
    // bass
    var b = track.bass[step];
    if (b) tone({ type: track.bassType, freq: hz(b), t0: when, dur: stepDur(track) * 0.9,
                  attack: 0.006, release: 0.04, peak: track.bassGain, dest: bgmBus });
    // lead（軽くデチューン重ねで厚みを）
    var l = track.lead[step];
    if (l) {
      tone({ type: track.leadType, freq: hz(l), t0: when, dur: stepDur(track) * 0.8,
             attack: 0.005, release: 0.05, peak: track.leadGain, dest: bgmBus });
      tone({ type: track.leadType, freq: hz(l), t0: when, dur: stepDur(track) * 0.8,
             attack: 0.005, release: 0.05, peak: track.leadGain * 0.5, detune: 7, dest: bgmBus });
    }
    // ボス曲は裏拍にハイハット風ノイズで疾走感
    if (track === TRACKS.boss && step % 2 === 1) {
      noise({ t0: when, dur: 0.04, peak: 0.12, type: 'highpass', freq: 7000, dest: bgmBus });
    }
  }

  function schedulerTick() {
    if (!sched.running || !sched.current) return;
    var track = sched.current;
    var sd = stepDur(track);
    while (sched.nextTime < ctx.currentTime + sched.lookahead) {
      scheduleStep(track, sched.step, sched.nextTime);
      sched.nextTime += sd;
      sched.step = (sched.step + 1) % track.steps; // ループ
    }
  }

  function startScheduler() {
    if (sched.timer) return;
    sched.timer = setInterval(schedulerTick, sched.tickMs);
  }
  function stopScheduler() {
    if (sched.timer) { clearInterval(sched.timer); sched.timer = null; }
  }

  // BGM 再生: name='normal'|'boss'。同名再指定は無視。切替は短いフェードで自然に。
  function playBGM(name) {
    if (!ctx) return;
    var track = TRACKS[name];
    if (!track || sched.current === track) { resume(); return; }
    resume();
    // クロスフェード: 一旦下げ→切替→戻す
    var t = ctx.currentTime;
    bgmBus.gain.cancelScheduledValues(t);
    bgmBus.gain.setTargetAtTime(0.0001, t, 0.05);
    setTimeout(function () {
      sched.current = track;
      sched.step = 0;
      sched.nextTime = ctx.currentTime + 0.05;
      sched.running = true;
      startScheduler();
      bgmBus.gain.setTargetAtTime(vol.bgm, ctx.currentTime, 0.08);
    }, 120);
  }

  // BGM 停止（フェードアウト）。
  function stopBGM() {
    if (!ctx) return;
    bgmBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
    setTimeout(function () {
      sched.running = false;
      sched.current = null;
      stopScheduler();
    }, 250);
  }

  // =========================================================================
  // 公開 API
  // =========================================================================
  global.AudioEngine = {
    init: init,
    unlock: unlock,
    resume: resume,
    isReady: isReady,
    sfx: sfx,
    playBGM: playBGM,
    stopBGM: stopBGM,
    setMasterVolume: setMasterVolume,
    setBgmVolume: setBgmVolume,
    setSfxVolume: setSfxVolume,
    toggleMute: toggleMute
  };
})(typeof window !== 'undefined' ? window : this);
