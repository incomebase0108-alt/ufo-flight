/* ════════════════════════════════════════════════════════════════════════
 *  upgrade-system.js  —  2号機担当：UFO強化 ＆ ドロップアイテム
 * ════════════════════════════════════════════════════════════════════════
 *
 *  スコア連動の永続アンロックと敵ドロップアイテムを追加するモジュール。
 *  1号機の統合土台（window.GAME のイベントバス＋onUpdate/onFire/onDamage＋
 *  GAME.refs）に *乗せるだけ* で動く。index.html は無改変。
 *
 *  ── 統合（1号機・自動） ──────────────────────────────────────────────
 *  index.html 末尾の UPGRADE-SYSTEM プレースホルダ <script> を embed.py が
 *  このファイル本体で置換してビルド（dist/・docs/）。よって
 *  *このファイルを更新して push → embed.py 再ビルド* で反映。手動ペースト不要。
 *  （任意②: レーザー貫通を“真の貫通”にしたい場合のみ、プレイヤー弾ヒット時の
 *   弾消去 約6か所を `if(!b.pierce){ scene.remove(b.mesh); bullets.splice(i,1); }`
 *   で包む。未対応でも高威力単発に劣化＝安全。）
 *
 *  ── 調整は全部ここ：CONFIG（① バランス調整プリセット） ────────────────
 *  下の CONFIG オブジェクト1箇所で全数値を変更できる。プリセット easy/normal/
 *  hard を用意。実機プレイ中に `UFOUpgrades.setPreset('hard')` で即切替も可。
 *
 *  ── 実装機能 ─────────────────────────────────────────────────────────
 *  【スコア連動アンロック（永続・scoreで自動解放）】
 *    連射2倍 / シールド+50 / 散弾3方向 / レーザー貫通 / メガビーム全方位斉射
 *  【敵ドロップアイテム（撃破地点に光る球。UFO接触で取得・取得で sfx.item 発火）】
 *    回復 / 弾薬 / 一時無敵 / スコア2倍 / 全画面ボム
 *  【武器の見た目（②）】 散弾=拡散弾 / 貫通=細ビーム+トレイル / メガ=全画面フラッシュ+極太
 *
 *  — 2号機（2026-05-29, UFO WAR / 先行拡張 ①②③）
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (typeof window === 'undefined' || !window.GAME){
    console.warn('[UFOUpgrades] window.GAME が見つかりません。1号機の統合土台より後ろに配置してください。');
    return;
  }
  var GAME = window.GAME;
  var T = window.THREE;

  // ════════════════════════════════════════════════════════════════════
  //  ① CONFIG — 調整値は全部ここ。PRESETS で easy/normal/hard を上書き。
  // ════════════════════════════════════════════════════════════════════
  var CONFIG = {
    preset: 'normal',
    // アンロック閾値（pt）
    unlock: { rapid:1000, shield:3000, spread:5000, pierce:10000, mega:20000 },
    // 連射・弾
    rapidExtraVolley: 1,   // 連射2倍：1トリガーあたり +1発
    ammoExtraVolley:  1,   // 弾薬バフ：さらに +1発
    bulletSpeed: 2.5,
    volleyStagger: 0.18,   // 連射弾を前方にずらす間隔
    // シールド
    shieldMax: 50, shieldRegenDelay: 3, shieldRegenRate: 8,
    // 散弾
    spreadCount: 3, spreadAngle: 0.22,
    // 貫通
    pierceDamage: 2,
    // メガビーム
    megaBeams: 24, megaDamage: 6, megaCooldown: 15, megaBeamLife: 2.0, megaSpeed: 3.2, megaBeamRadius: 0.05,
    // ドロップ（敵種別の出現率／種類の重み）
    dropChance:  { fighter:0.22, mecha:0.5, ship:0.6, tank:0.28, base:0.85, boss:1.0 },
    dropWeights: { heal:40, ammo:30, invinc:15, score2x:8, bomb:7 },
    maxItems: 6, itemLife: 18, pickupRadius: 0.6,
    // アイテム効果
    healAmount: 30, overchargeDuration: 8, invincDuration: 6, score2xDuration: 12,
    bombBeams: 28, bombDamage: 5,   // 全画面ボム（即時の放射斉射）
  };
  var PRESETS = {
    easy: {
      shieldMax:80, shieldRegenRate:12, megaCooldown:10, healAmount:45, invincDuration:8, score2xDuration:16,
      dropChance:{ fighter:0.32, mecha:0.6, ship:0.7, tank:0.4, base:1.0, boss:1.0 },
      unlock:{ rapid:700, shield:2000, spread:3500, pierce:7000, mega:14000 },
    },
    normal: {},
    hard: {
      shieldMax:30, shieldRegenRate:5, megaCooldown:22, healAmount:20, invincDuration:4, score2xDuration:8,
      dropChance:{ fighter:0.14, mecha:0.4, ship:0.5, tank:0.2, base:0.7, boss:1.0 },
      unlock:{ rapid:1500, shield:4500, spread:7500, pierce:15000, mega:30000 },
    },
  };
  // PRESETS[name] を CONFIG に1階層 deep-merge（ネスト obj はキー単位で上書き）
  function applyPreset(name){
    if (!PRESETS[name]) return;
    var base = JSON.parse(JSON.stringify(DEFAULTS));   // 既定に戻してから上書き
    var ov = PRESETS[name];
    for (var k in ov){
      if (ov[k] && typeof ov[k] === 'object' && !Array.isArray(ov[k])){
        base[k] = base[k] || {};
        for (var kk in ov[k]) base[k][kk] = ov[k][kk];
      } else base[k] = ov[k];
    }
    base.preset = name;
    CONFIG = base;
    if (S){ S.shieldMax = CONFIG.shieldMax; }   // 反映
  }
  var DEFAULTS = JSON.parse(JSON.stringify(CONFIG));   // 既定スナップショット

  // ── アンロック表示（label のみ。閾値は CONFIG.unlock） ──────
  var TIERS = [
    { key:'rapid',  label:'⚡ 連射2倍' },
    { key:'shield', label:'🛡 シールド+50' },
    { key:'spread', label:'﹅ 散弾3方向' },
    { key:'pierce', label:'🔆 レーザー貫通' },
    { key:'mega',   label:'💥 メガビーム' },
  ];

  // ── ドロップアイテム定義（③：色・形・効果） ────────────────
  var DROPS = {
    heal:    { color:0x33ff66, icon:'✚', label:'HP回復',     shape:'cross' },
    ammo:    { color:0xffcc22, icon:'▣', label:'弾薬チャージ', shape:'box' },
    invinc:  { color:0x9fe8ff, icon:'★', label:'一時無敵',     shape:'rainbow' },
    score2x: { color:0xffd54a, icon:'×2', label:'スコア2倍',   shape:'star' },
    bomb:    { color:0xff5522, icon:'✸', label:'全画面ボム',   shape:'spike' },
  };

  // ── 内部状態 ───────────────────────────────────────────────
  var S = {
    rapid:false, shield:false, spread:false, pierce:false, mega:false,
    shieldMax:CONFIG.shieldMax, shieldHp:0, sinceHit:99,
    overcharge:0, invinc:0, score2x:0,
    megaCharge:0,
    // score2x（外部増分のみ2倍にする・フィードバックループ防止）
    _lastExternal:null, _bonusTotal:0,
  };
  var items = [];     // ドロップ中アイテム
  var trails = [];    // ②トレイルの残像（上限管理）
  var TRAIL_CAP = 70;
  var lastScore = -1;
  var hud = null, flashEl = null, flashTime = 0;

  // ════════════════════════════════════════════════════════════════════
  //  HUD ＋ 全画面フラッシュ（②メガビーム演出）
  // ════════════════════════════════════════════════════════════════════
  function buildDom(){
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:10px;bottom:150px;z-index:11;'
      + 'font-family:monospace;font-size:11px;line-height:1.5;color:#cfe9ff;'
      + 'text-shadow:0 0 6px #000;pointer-events:none;white-space:nowrap';
    document.body.appendChild(hud);
    flashEl = document.createElement('div');
    flashEl.style.cssText = 'position:fixed;inset:0;z-index:9;pointer-events:none;'
      + 'background:radial-gradient(circle,#fff 0%,#ff66ff 60%,transparent 100%);opacity:0';
    document.body.appendChild(flashEl);
  }
  function refreshHud(){
    if (!hud) return;
    var lines = [];
    var un = TIERS.filter(function(t){ return S[t.key]; }).map(function(t){ return t.label; });
    if (un.length) lines.push('強化: ' + un.join(' / '));
    if (S.shield)         lines.push('🛡 シールド ' + Math.ceil(S.shieldHp) + '/' + S.shieldMax);
    if (S.overcharge > 0) lines.push('▣ 弾薬チャージ ' + S.overcharge.toFixed(1) + 's');
    if (S.invinc > 0)     lines.push('★ 無敵 ' + S.invinc.toFixed(1) + 's');
    if (S.score2x > 0)    lines.push('×2 スコア2倍 ' + S.score2x.toFixed(1) + 's');
    if (S.mega) lines.push('💥 メガビーム ' + (S.megaCharge >= CONFIG.megaCooldown ? 'READY' : Math.ceil(CONFIG.megaCooldown - S.megaCharge) + 's'));
    lines.push('〔preset: ' + CONFIG.preset + '〕');
    hud.innerHTML = lines.join('<br>');
  }
  function warn(msg){ try { GAME.refs.showWarn(msg); } catch(e){} }
  function triggerFlash(){ flashTime = 0.32; }

  // ════════════════════════════════════════════════════════════════════
  //  スコアアンロック判定（onUpdate ポーリング）
  // ════════════════════════════════════════════════════════════════════
  function checkUnlocks(){
    var total = GAME.refs.score | 0;
    if (total === lastScore) return;
    lastScore = total;
    var U = CONFIG.unlock;
    for (var i = 0; i < TIERS.length; i++){
      var t = TIERS[i];
      if (!S[t.key] && total >= U[t.key]){
        S[t.key] = true;
        if (t.key === 'shield'){ S.shieldMax = CONFIG.shieldMax; S.shieldHp = S.shieldMax; }
        if (t.key === 'mega') S.megaCharge = 0;
        warn('🆙 アンロック！ ' + t.label + '（' + U[t.key] + 'pt）');
      }
    }
    refreshHud();
  }

  // ════════════════════════════════════════════════════════════════════
  //  ② 発射拡張（GAME.onFire）：見た目の違う弾を撃つ
  // ════════════════════════════════════════════════════════════════════
  var _spreadMat=null, _pierceGeo=null, _pierceMat=null, _trailMat=null;
  function lazyFireAssets(){
    if (!_spreadMat) _spreadMat = new T.MeshBasicMaterial({ color:0xffa033 });
    if (!_pierceGeo) _pierceGeo = new T.CylinderGeometry(0.012, 0.012, 0.55, 6);  // 細い貫通ビーム
    if (!_pierceMat) _pierceMat = new T.MeshBasicMaterial({ color:0x66ffff });
    if (!_trailMat)  _trailMat  = new T.MeshBasicMaterial({ color:0x66ffff, transparent:true, opacity:0.5 });
  }
  function spawnBullet(pos, dir, dmg, pierce, spread){
    lazyFireAssets();
    var b, vel = dir.clone().multiplyScalar(CONFIG.bulletSpeed);
    if (pierce){
      b = new T.Mesh(_pierceGeo, _pierceMat);
      b.position.copy(pos);
      b.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), dir);
      b._trail = true;                          // ②トレイル対象
    } else {
      var mat = spread ? _spreadMat : window.playerBulletMat;
      b = new T.Mesh(window.bulletGeo, mat);
      b.position.copy(pos);
    }
    GAME.refs.scene.add(b);
    GAME.refs.bullets.push({ mesh:b, vel:vel, life:3, dmg:dmg, pierce:!!pierce });
  }
  function onFire(){
    if (!S.rapid && !S.spread && !S.pierce && S.overcharge <= 0) return false; // 無強化は既定発射
    var p = GAME.refs.playerGroup.position;
    var aim = GAME.refs.aimDir();
    var axis = p.clone().normalize();
    var n = S.spread ? CONFIG.spreadCount : 1;
    var half = (n - 1) / 2;
    var volley = 1 + (S.rapid ? CONFIG.rapidExtraVolley : 0) + (S.overcharge > 0 ? CONFIG.ammoExtraVolley : 0);
    for (var i = 0; i < n; i++){
      var ang = (i - half) * CONFIG.spreadAngle;
      var base = aim.clone().applyAxisAngle(axis, ang);
      for (var v = 0; v < volley; v++){
        var pos = p.clone().addScaledVector(base, v * CONFIG.volleyStagger);
        spawnBullet(pos, base.clone(), S.pierce ? CONFIG.pierceDamage : 1, S.pierce, S.spread);
      }
    }
    return true;
  }

  // ════════════════════════════════════════════════════════════════════
  //  被ダメージ修飾（GAME.onDamage）：無敵→シールド→残りHP
  // ════════════════════════════════════════════════════════════════════
  function onDamage(n){
    S.sinceHit = 0;
    if (S.invinc > 0) return 0;
    if (S.shield && S.shieldHp > 0){
      if (S.shieldHp >= n){ S.shieldHp -= n; refreshHud(); return 0; }
      var rem = n - S.shieldHp; S.shieldHp = 0; refreshHud(); return rem;
    }
    return n;
  }

  // ════════════════════════════════════════════════════════════════════
  //  放射斉射（メガビーム ＆ 全画面ボムで共用）
  // ════════════════════════════════════════════════════════════════════
  var _radGeo=null, _radGeoBomb=null, _radMat=null, _bombMat=null;
  function radialDischarge(beams, dmg, life, color, thick){
    var pg = GAME.refs.playerGroup, scene = GAME.refs.scene, arr = GAME.refs.bullets;
    var geo = thick ? (_radGeo || (_radGeo = new T.CylinderGeometry(CONFIG.megaBeamRadius, CONFIG.megaBeamRadius, 0.8, 8)))
                    : (_radGeoBomb || (_radGeoBomb = new T.CylinderGeometry(0.03, 0.03, 0.6, 8)));
    var mat = thick ? (_radMat || (_radMat = new T.MeshBasicMaterial({ color:0xff3df0 })))
                    : (_bombMat || (_bombMat = new T.MeshBasicMaterial({ color:color||0xff7722 })));
    var p = pg.position, outward = p.clone().normalize();
    var east = new T.Vector3(0,1,0).cross(outward);
    if (east.lengthSq() < 0.001) east.set(1,0,0);
    east.normalize();
    var north = outward.clone().cross(east).normalize();
    for (var i = 0; i < beams; i++){
      var a = (Math.PI * 2 * i) / beams;
      var d = north.clone().multiplyScalar(Math.cos(a)).add(east.clone().multiplyScalar(Math.sin(a)));
      var b = new T.Mesh(geo, mat);
      b.position.copy(p);
      b.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), d);
      scene.add(b);
      arr.push({ mesh:b, vel:d.clone().multiplyScalar(CONFIG.megaSpeed), life:life, dmg:dmg, pierce:true });
    }
    var flash = new T.PointLight(color || 0xff66ff, 12, 8);
    flash.position.copy(p); scene.add(flash);
    setTimeout(function(){ scene.remove(flash); }, 150);
  }
  function megaDischarge(){
    radialDischarge(CONFIG.megaBeams, CONFIG.megaDamage, CONFIG.megaBeamLife, 0xff66ff, true);
    triggerFlash();
    warn('💥 メガビーム発射！');
  }
  function bombDischarge(){
    radialDischarge(CONFIG.bombBeams, CONFIG.bombDamage, 1.6, 0xff7722, false);
    triggerFlash();
    warn('✸ 全画面ボム炸裂！');
  }

  // ════════════════════════════════════════════════════════════════════
  //  ③ ドロップ生成・形状・取得
  // ════════════════════════════════════════════════════════════════════
  function pickDropType(){
    var w = CONFIG.dropWeights, keys = Object.keys(w), sum = 0, i;
    for (i = 0; i < keys.length; i++) sum += w[keys[i]];
    var r = Math.random() * sum;
    for (i = 0; i < keys.length; i++){ r -= w[keys[i]]; if (r <= 0) return keys[i]; }
    return 'heal';
  }
  // 種類別のコア形状（③ アイコン的形状）
  function makeCore(shape, col){
    var m = new T.MeshBasicMaterial({ color:col });
    if (shape === 'cross'){                       // 回復＝十字
      var g = new T.Group();
      g.add(new T.Mesh(new T.BoxGeometry(0.16, 0.05, 0.05), m));
      g.add(new T.Mesh(new T.BoxGeometry(0.05, 0.16, 0.05), m));
      return g;
    }
    if (shape === 'box')    return new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.12), m);            // 弾薬
    if (shape === 'star')   return new T.Mesh(new T.TorusKnotGeometry(0.06, 0.022, 48, 6), m);    // スコア2倍
    if (shape === 'spike')  return new T.Mesh(new T.OctahedronGeometry(0.1, 0), m);               // ボム
    return new T.Mesh(new T.IcosahedronGeometry(0.09, 0), m);                                     // 無敵ほか
  }
  function spawnDrop(pos, chance){
    if (!pos || Math.random() > chance) return;
    if (items.length >= CONFIG.maxItems) return;
    var key = pickDropType(), def = DROPS[key], col = def.color, scene = GAME.refs.scene;
    var g = new T.Group();
    g.add(makeCore(def.shape, col));
    var ring = new T.Mesh(new T.TorusGeometry(0.15, 0.025, 6, 18),
                          new T.MeshBasicMaterial({ color:col, transparent:true, opacity:0.85 }));
    g.add(ring);
    g.add(new T.PointLight(col, 1.4, 1.8));
    g.position.copy(pos);
    scene.add(g);
    items.push({ mesh:g, ring:ring, type:key, life:CONFIG.itemLife, hue:0 });
  }
  function applyDrop(key){
    if (key === 'heal')        GAME.refs.heal(CONFIG.healAmount);
    else if (key === 'ammo')   S.overcharge = CONFIG.overchargeDuration;
    else if (key === 'invinc') S.invinc = CONFIG.invincDuration;
    else if (key === 'score2x'){ S.score2x = CONFIG.score2xDuration; }
    else if (key === 'bomb')   bombDischarge();
    warn(DROPS[key].icon + ' ' + DROPS[key].label);
    GAME.emit('itemGet', { type:key });   // ★ 4号機 sfx.item() 発火（③配線）
    refreshHud();
  }

  // ── ②トレイル：貫通/メガ弾の残像を生成・減衰 ───────────────
  function updateTrails(dt){
    var scene = GAME.refs.scene, arr = GAME.refs.bullets, i;
    lazyFireAssets();
    for (i = 0; i < arr.length; i++){
      var b = arr[i];
      if (b && b._trail && trails.length < TRAIL_CAP){
        var ghost = new T.Mesh(_pierceGeo, _trailMat.clone());
        ghost.position.copy(b.mesh.position);
        ghost.quaternion.copy(b.mesh.quaternion);
        scene.add(ghost);
        trails.push({ mesh:ghost, life:0.22 });
      }
    }
    for (i = trails.length - 1; i >= 0; i--){
      var tr = trails[i];
      tr.life -= dt;
      tr.mesh.material.opacity = Math.max(0, tr.life / 0.22) * 0.5;
      if (tr.life <= 0){ scene.remove(tr.mesh); trails.splice(i, 1); }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  毎フレーム更新（GAME.onUpdate）
  // ════════════════════════════════════════════════════════════════════
  function update(dt){
    checkUnlocks();
    if (S.overcharge > 0) S.overcharge = Math.max(0, S.overcharge - dt);
    if (S.invinc > 0)     S.invinc     = Math.max(0, S.invinc - dt);
    if (S.score2x > 0)    S.score2x    = Math.max(0, S.score2x - dt);
    S.sinceHit += dt;

    // スコア2倍：外部増分だけを追い足し（自分の加点はループしないよう除外）
    var cur = GAME.refs.score | 0;
    var external = cur - S._bonusTotal;
    if (S._lastExternal === null) S._lastExternal = external;
    var extDelta = external - S._lastExternal;
    if (S.score2x > 0 && extDelta > 0){ GAME.refs.addScore(extDelta); S._bonusTotal += extDelta; }
    S._lastExternal = external;

    // シールド自動再生
    if (S.shield && S.shieldHp < S.shieldMax && S.sinceHit > CONFIG.shieldRegenDelay){
      S.shieldHp = Math.min(S.shieldMax, S.shieldHp + CONFIG.shieldRegenRate * dt);
    }
    // メガビーム蓄積→自動斉射
    if (S.mega){
      S.megaCharge += dt;
      if (S.megaCharge >= CONFIG.megaCooldown){ S.megaCharge = 0; megaDischarge(); }
    }
    // 全画面フラッシュ減衰
    if (flashTime > 0 && flashEl){ flashTime = Math.max(0, flashTime - dt); flashEl.style.opacity = (flashTime / 0.32 * 0.6).toFixed(3); }

    updateTrails(dt);

    // ドロップアイテム：アニメ・寿命・取得
    var pg = GAME.refs.playerGroup, scene = GAME.refs.scene;
    for (var i = items.length - 1; i >= 0; i--){
      var it = items[i];
      it.ring.rotation.z += 0.07;
      it.mesh.rotation.y += 0.04;
      if (it.type === 'invinc'){ it.hue = (it.hue + dt * 0.6) % 1; setGroupHue(it.mesh, it.hue); } // 虹
      it.life -= dt;
      if (it.life <= 0){ scene.remove(it.mesh); items.splice(i, 1); continue; }
      if (it.mesh.position.distanceTo(pg.position) < CONFIG.pickupRadius){
        GAME.refs.explode(it.mesh.position.clone(), 0.6, DROPS[it.type].color);
        applyDrop(it.type);
        scene.remove(it.mesh); items.splice(i, 1);
      }
    }
    refreshHud();
  }
  function setGroupHue(group, h){
    var c = new T.Color(); c.setHSL(h, 1, 0.6);
    group.traverse(function(o){ if (o.material && o.material.color) o.material.color.copy(c); });
  }

  // ════════════════════════════════════════════════════════════════════
  //  接続（1号機の土台へ）
  // ════════════════════════════════════════════════════════════════════
  applyPreset(CONFIG.preset);
  buildDom();
  GAME.onUpdate(update);
  GAME.onFire(onFire);
  GAME.onDamage(onDamage);
  GAME.on('enemyDestroyed', function(d){ spawnDrop(d && d.pos, (d && d.type === 'mecha') ? CONFIG.dropChance.mecha : CONFIG.dropChance.fighter); });
  GAME.on('unitDestroyed',  function(d){ spawnDrop(d && d.pos, (d && CONFIG.dropChance[d.type] != null) ? CONFIG.dropChance[d.type] : 0.28); });
  GAME.on('baseDestroyed',  function(d){ spawnDrop(d && d.pos, CONFIG.dropChance.base); });
  GAME.on('bossDestroyed',  function(d){ spawnDrop(d && d.pos, CONFIG.dropChance.boss); });

  // 公開 API（プリセット切替・デバッグ）
  window.UFOUpgrades = {
    setPreset: function(name){ applyPreset(name); refreshHud(); warn('⚙ preset: ' + CONFIG.preset); return CONFIG.preset; },
    getConfig: function(){ return CONFIG; },
    _state:S, _items:items, onFire:onFire, onDamage:onDamage, update:update,
  };
  console.log('[UFOUpgrades] 2号機 UFO強化＆ドロップアイテム 接続完了（preset=' + CONFIG.preset + '）');
})();
