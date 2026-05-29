/* ════════════════════════════════════════════════════════════════════════
 *  upgrade-system.js  —  2号機担当：UFO強化 ＆ ドロップアイテム
 * ════════════════════════════════════════════════════════════════════════
 *
 *  UFO地球侵略ゲームの「スコア連動の永続アンロック」と「敵ドロップアイテム」を
 *  追加するモジュール。1号機が用意した統合土台（window.GAME のイベントバス＋
 *  onUpdate / onFire / onDamage フック＋GAME.refs）に *乗せるだけ* で動きます。
 *  既存コードは無改変です（1号機の設計方針「触らず末尾に追記」に準拠）。
 *
 *  ── 1号機向け 統合手順 ──────────────────────────────────────────────
 *  ① このファイル全体を index.html の *末尾の追記モジュール領域* に貼り付ける
 *     （4号機 audio と同じ。GAME 定義より後ろならどこでも可）。これだけで完了。
 *
 *  ② （任意・レーザー貫通を“本当に貫通”させたい場合のみ）
 *     プレイヤー弾の当たり判定でヒット時に弾を消している箇所（現状6か所程度の
 *       `scene.remove(b.mesh); bullets.splice(i,1);`  ※ボス判定のみ splice(j,1)）を
 *       `if(!b.pierce){ scene.remove(b.mesh); bullets.splice(i,1); }`
 *     と pierce ガードで包む。未対応でもクラッシュせず、貫通弾が単発ヒットに
 *     劣化するだけ（＝安全にフォールバック）。
 *
 *  使用する GAME API（すべて 1号機実装済み）:
 *    GAME.onUpdate(fn)        毎フレーム fn(dt)
 *    GAME.onFire(fn)          発射拡張。true を返すと既定発射をスキップ
 *    GAME.onDamage(fn)        被ダメ修飾。fn(n)=>修正後n（0以下で無効化）
 *    GAME.on(name, fn)        イベント購読
 *    GAME.refs.{score, playerGroup, scene, bullets, addScore, heal,
 *               explode, showWarn, aimDir}
 *    発火イベント: enemyDestroyed / unitDestroyed / baseDestroyed / bossDestroyed
 *                 （いずれも {pos,...} を持つ → ドロップ位置に使用）
 *
 *  ── 実装機能 ─────────────────────────────────────────────────────────
 *  【スコア連動アンロック（永続・スコアで自動解放）】
 *    1000pt  連射2倍      … 1トリガーで2連射（弾薬と重なれば更に+1）
 *    3000pt  シールド+50  … HP前に50の吸収シールド（被弾3秒後から自動再生）
 *    5000pt  散弾3方向    … 通常射撃が常時3方向に
 *    10000pt レーザー貫通 … 弾が敵を貫通（pierce／②未対応時は高威力単発に劣化）
 *    20000pt メガビーム   … 約15秒ごとに全方位ビーム斉射（全画面殲滅）
 *  【敵ドロップアイテム（撃破地点に光る球。UFOで触れて取得）】
 *    回復(heal)     … HP+30
 *    弾薬(ammo)     … 8秒オーバーチャージ（さらに+1連射）
 *    一時無敵(invinc)… 6秒間ダメージ無効
 *
 *  — 2号機（2026-05-29, UFO WAR）
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (typeof window === 'undefined' || !window.GAME){
    console.warn('[UFOUpgrades] window.GAME が見つかりません。1号機の統合土台より後ろに配置してください。');
    return;
  }
  var GAME = window.GAME;
  var T = window.THREE;

  // ── スコア連動アンロック定義（key は S のフラグ名） ──────────
  var TIERS = [
    { score:1000,  key:'rapid',  label:'⚡ 連射2倍' },
    { score:3000,  key:'shield', label:'🛡 シールド+50' },
    { score:5000,  key:'spread', label:'﹅ 散弾3方向' },
    { score:10000, key:'pierce', label:'🔆 レーザー貫通' },
    { score:20000, key:'mega',   label:'💥 メガビーム' },
  ];

  // ── ドロップアイテム定義 ───────────────────────────────────
  var DROPS = {
    heal:   { color:0x33ff66, icon:'✚', label:'HP回復 +30' },
    ammo:   { color:0xffcc22, icon:'▣', label:'弾薬チャージ（連射UP 8秒）' },
    invinc: { color:0x9fe8ff, icon:'★', label:'一時無敵 6秒' },
  };
  var DROP_WEIGHTS = [['heal',45],['ammo',35],['invinc',20]];   // 抽選の重み

  // ── 内部状態 ───────────────────────────────────────────────
  var S = {
    rapid:false, shield:false, spread:false, pierce:false, mega:false, // 永続アンロック
    shieldMax:50, shieldHp:0, sinceHit:99,                              // シールド：最大/残量/被弾後経過
    overcharge:0, invinc:0,                                             // 弾薬バフ・無敵 の残り秒
    megaCharge:0, megaCd:15,                                            // メガビーム蓄積/クールダウン秒
  };
  var items = [];     // ドロップ中アイテム
  var lastScore = -1; // アンロック判定の前回スコア
  var hud = null;

  // ── HUD（独自要素。1号機の puHud と被らない位置） ───────────
  function buildHud(){
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:10px;bottom:150px;z-index:11;'
      + 'font-family:monospace;font-size:11px;line-height:1.5;color:#cfe9ff;'
      + 'text-shadow:0 0 6px #000;pointer-events:none;white-space:nowrap';
    document.body.appendChild(hud);
  }
  function refreshHud(){
    if (!hud) return;
    var lines = [];
    var un = TIERS.filter(function(t){ return S[t.key]; }).map(function(t){ return t.label; });
    if (un.length) lines.push('強化: ' + un.join(' / '));
    if (S.shield) lines.push('🛡 シールド ' + Math.ceil(S.shieldHp) + '/' + S.shieldMax);
    if (S.overcharge > 0) lines.push('▣ 弾薬チャージ ' + S.overcharge.toFixed(1) + 's');
    if (S.invinc > 0)     lines.push('★ 無敵 ' + S.invinc.toFixed(1) + 's');
    if (S.mega) lines.push('💥 メガビーム ' + (S.megaCharge >= S.megaCd ? 'READY' : Math.ceil(S.megaCd - S.megaCharge) + 's'));
    hud.innerHTML = lines.join('<br>');
  }
  function warn(msg){ try { GAME.refs.showWarn(msg); } catch(e){} }

  // ── スコアアンロック判定（onUpdate からポーリング） ─────────
  function checkUnlocks(){
    var total = GAME.refs.score | 0;
    if (total === lastScore) return;
    lastScore = total;
    for (var i = 0; i < TIERS.length; i++){
      var t = TIERS[i];
      if (!S[t.key] && total >= t.score){
        S[t.key] = true;
        if (t.key === 'shield') S.shieldHp = S.shieldMax;
        if (t.key === 'mega') S.megaCharge = 0;
        warn('🆙 アンロック！ ' + t.label + '（' + t.score + 'pt）');
      }
    }
    refreshHud();
  }

  // ── 発射拡張（GAME.onFire）。強化中は自前発射して true を返す ──
  function makeBullet(pos, dir, dmg, pierce){
    var b = new T.Mesh(window.bulletGeo, window.playerBulletMat);
    b.position.copy(pos);
    GAME.refs.scene.add(b);
    GAME.refs.bullets.push({ mesh:b, vel:dir.multiplyScalar(2.5), life:3, dmg:dmg, pierce:pierce });
  }
  function onFire(){
    // 強化が何も無ければ既定発射に任せる（drop の beam/multi も温存）
    if (!S.rapid && !S.spread && !S.pierce && S.overcharge <= 0) return false;
    var pg = GAME.refs.playerGroup;
    var p = pg.position;
    var aim = GAME.refs.aimDir();
    var axis = p.clone().normalize();
    var dirs = S.spread ? [-0.22, 0, 0.22] : [0];          // 方向数（散弾で3）
    var volley = 1 + (S.rapid ? 1 : 0) + (S.overcharge > 0 ? 1 : 0); // 連射数（連射2倍/弾薬）
    for (var di = 0; di < dirs.length; di++){
      var base = aim.clone().applyAxisAngle(axis, dirs[di]);
      for (var v = 0; v < volley; v++){
        var pos = p.clone().addScaledVector(base, v * 0.18); // 少し前に置いて連射を散らす
        makeBullet(pos, base.clone(), S.pierce ? 2 : 1, S.pierce);
      }
    }
    return true; // 既定発射スキップ
  }

  // ── 被ダメージ修飾（GAME.onDamage）：無敵→シールド→残りをHPへ ─
  function onDamage(n){
    S.sinceHit = 0;
    if (S.invinc > 0) return 0;                       // 一時無敵：完全カット
    if (S.shield && S.shieldHp > 0){
      if (S.shieldHp >= n){ S.shieldHp -= n; refreshHud(); return 0; }
      var rem = n - S.shieldHp; S.shieldHp = 0; refreshHud(); return rem;
    }
    return n;
  }

  // ── メガビーム：全方位ビーム斉射 ────────────────────────────
  var _megaGeo = null, _megaMat = null;
  function megaDischarge(){
    var pg = GAME.refs.playerGroup, scene = GAME.refs.scene, arr = GAME.refs.bullets;
    if (!_megaGeo) _megaGeo = new T.CylinderGeometry(0.035, 0.035, 0.7, 8);
    if (!_megaMat) _megaMat = new T.MeshBasicMaterial({ color:0xff3df0 });
    var p = pg.position;
    var outward = p.clone().normalize();
    var east = new T.Vector3(0,1,0).cross(outward);
    if (east.lengthSq() < 0.001) east.set(1,0,0);
    east.normalize();
    var north = outward.clone().cross(east).normalize();
    var N = 24;
    for (var i = 0; i < N; i++){
      var a = (Math.PI * 2 * i) / N;
      var d = north.clone().multiplyScalar(Math.cos(a)).add(east.clone().multiplyScalar(Math.sin(a)));
      var b = new T.Mesh(_megaGeo, _megaMat);
      b.position.copy(p);
      b.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), d);
      scene.add(b);
      arr.push({ mesh:b, vel:d.clone().multiplyScalar(3.2), life:2.0, dmg:6, pierce:true });
    }
    var flash = new T.PointLight(0xff66ff, 12, 8);
    flash.position.copy(p); scene.add(flash);
    setTimeout(function(){ scene.remove(flash); }, 150);
    warn('💥 メガビーム発射！');
  }

  // ── ドロップ生成（撃破イベントから） ──────────────────────
  function pickDropType(){
    var sum = 0, i; for (i = 0; i < DROP_WEIGHTS.length; i++) sum += DROP_WEIGHTS[i][1];
    var r = Math.random() * sum;
    for (i = 0; i < DROP_WEIGHTS.length; i++){ r -= DROP_WEIGHTS[i][1]; if (r <= 0) return DROP_WEIGHTS[i][0]; }
    return 'heal';
  }
  function spawnDrop(pos, chance){
    if (!pos || Math.random() > chance) return;
    if (items.length >= 6) return;                    // 画面が埋まり過ぎない上限
    var key = pickDropType(), col = DROPS[key].color, scene = GAME.refs.scene;
    var g = new T.Group();
    g.add(new T.Mesh(new T.IcosahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ color:col })));
    var ring = new T.Mesh(new T.TorusGeometry(0.15, 0.025, 6, 18),
                          new T.MeshBasicMaterial({ color:col, transparent:true, opacity:0.85 }));
    g.add(ring);
    g.add(new T.PointLight(col, 1.4, 1.8));
    g.position.copy(pos);
    scene.add(g);
    items.push({ mesh:g, ring:ring, type:key, life:18 });
  }
  function applyDrop(key){
    if (key === 'heal') GAME.refs.heal(30);
    else if (key === 'ammo') S.overcharge = 8;
    else if (key === 'invinc') S.invinc = 6;
    warn(DROPS[key].icon + ' ' + DROPS[key].label);
    refreshHud();
  }

  // ── 毎フレーム更新（GAME.onUpdate） ───────────────────────
  function update(dt){
    checkUnlocks();
    if (S.overcharge > 0) S.overcharge = Math.max(0, S.overcharge - dt);
    if (S.invinc > 0)     S.invinc     = Math.max(0, S.invinc - dt);
    S.sinceHit += dt;
    // シールド自動再生（被弾後3秒で開始、8/秒）
    if (S.shield && S.shieldHp < S.shieldMax && S.sinceHit > 3){
      S.shieldHp = Math.min(S.shieldMax, S.shieldHp + 8 * dt);
    }
    // メガビーム蓄積→満タンで自動斉射
    if (S.mega){
      S.megaCharge += dt;
      if (S.megaCharge >= S.megaCd){ S.megaCharge = 0; megaDischarge(); }
    }
    // ドロップアイテム：アニメ・寿命・取得
    var pg = GAME.refs.playerGroup, scene = GAME.refs.scene;
    for (var i = items.length - 1; i >= 0; i--){
      var it = items[i];
      it.ring.rotation.z += 0.07;
      it.mesh.rotation.y += 0.04;
      it.life -= dt;
      if (it.life <= 0){ scene.remove(it.mesh); items.splice(i, 1); continue; }
      if (it.mesh.position.distanceTo(pg.position) < 0.6){
        GAME.refs.explode(it.mesh.position.clone(), 0.6, DROPS[it.type].color);
        applyDrop(it.type);
        scene.remove(it.mesh); items.splice(i, 1);
      }
    }
    refreshHud();
  }

  // ── 接続（1号機の土台へ乗せる） ────────────────────────────
  buildHud();
  GAME.onUpdate(update);
  GAME.onFire(onFire);
  GAME.onDamage(onDamage);
  // 撃破イベント → 種別ごとのドロップ確率で生成
  GAME.on('enemyDestroyed', function(d){ spawnDrop(d && d.pos, (d && d.type === 'mecha') ? 0.5 : 0.22); });
  GAME.on('unitDestroyed',  function(d){ spawnDrop(d && d.pos, (d && d.type === 'ship') ? 0.6 : 0.28); });
  GAME.on('baseDestroyed',  function(d){ spawnDrop(d && d.pos, 0.85); });
  GAME.on('bossDestroyed',  function(d){ spawnDrop(d && d.pos, 1.0); });

  // デバッグ／テスト用に公開（任意）
  window.UFOUpgrades = { _state:S, _items:items, onFire:onFire, onDamage:onDamage, update:update };
  console.log('[UFOUpgrades] 2号機 UFO強化＆ドロップアイテム 接続完了');
})();
