/* ════════════════════════════════════════════════════════════════════════
 *  fx-and-enemies.js  —  3号機担当：演出強化 ＆ 新敵「誘導ミサイル」＆ 戦闘機AI修正
 * ════════════════════════════════════════════════════════════════════════
 *
 *  UFO地球侵略ゲームに以下を追加するモジュール。1号機が用意した統合土台
 *  （window.GAME のイベントバス＋onUpdate フック＋GAME.refs）に *乗せるだけ* で
 *  動きます。既存コードは無改変（1号機の設計方針「触らず末尾に追記」に準拠）。
 *  ※ モデル読込（GLTFLoader.load 等）は一切しません。GLB は1号機が embed.py で
 *     埋込済・mk* 差替済のため、二重ロードを避けここでは触れません。
 *
 *  ── 1号機向け 統合手順 ──────────────────────────────────────────────
 *  ① このファイル全体を index.html の *末尾の追記モジュール領域* に貼り付ける
 *     （4号機 audio / 2号機 upgrade-system と同じ。GAME 定義より後ろならどこでも可）。
 *     これだけで完了（index.html ロジックの改変は不要）。
 *  ② embed.py で単一HTML化する場合は audio と同様にマーカー方式でも可
 *     （例：placeholder `/*__FX_3GOKI__*\/` を1つ足して replace）。お任せします。
 *
 *  使用する GAME API（すべて 1号機実装済み）:
 *    GAME.onUpdate(fn)        毎フレーム fn(dt)。※update()末尾＝updateCamera/内蔵敵AIの
 *                             *後*・render の *前* に走るので、カメラ揺らし・敵AI上書きが可能。
 *    GAME.on(name, fn)        イベント購読
 *    GAME.refs.{scene,camera,playerGroup,enemies,bases,bullets,eBullets,
 *               playerHP,addScore,damage,showWarn}
 *    購読イベント: 'playerHit' {n} … 画面シェイク / 'explosion' {pos,size,color} … 演出上乗せ
 *
 *  ── 実装機能 ─────────────────────────────────────────────────────────
 *  【新敵：誘導ミサイル】プレイヤーを追尾。旋回レート制限で回避可能。プレイヤー弾で
 *     迎撃可（+120pt）。命中で被弾(15)＋爆発。基地から発射（基地全滅時は周囲低空）。
 *  【爆発強化】既存 explode の 'explosion' イベントに乗せて 破片・煙・衝撃波・発光コア を
 *     “上乗せ”（既存の火球＋PointLight は据え置き）。サイズでスケール（小爆発は軽量）。
 *  【画面シェイク】被弾('playerHit')でカメラを一時的に揺らす（ダメージ量に比例・減衰）。
 *  【戦闘機AI修正 ②③（hoshi実機FB）】内蔵AIの「目標到達で停止／自機停止で敵停止」を解消。
 *     onUpdate が内蔵AIの後に走る性質を使い、毎フレーム敵位置を上書き：
 *       ・常に最低速度で動き続ける（プレイヤー速度に非依存）
 *       ・遠い=接近 / 近い=プレイヤー周囲を旋回 の2モード切替
 *  ※ ①「戦車/ロボが海に出る」は陸地判定が必要で配置側(1号機)と要相談のため本モジュール未対応。
 * ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.GAME || !window.THREE) {
    console.warn('[3号機] GAME / THREE 未定義のため FX/新敵モジュールをスキップ');
    return;
  }
  var THREE = window.THREE;
  var R = GAME.refs;
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  // ════════════════════════════════════════════════════════════
  //  共有：煙パーティクル（爆発の煙・ミサイル排煙で共有）
  // ════════════════════════════════════════════════════════════
  var smokePuffs = [];
  function spawnSmokePuff(pos, size, color) {
    var s = new THREE.Mesh(
      new THREE.SphereGeometry(size, 6, 6),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.55, depthWrite: false })
    );
    s.position.copy(pos);
    R.scene.add(s);
    smokePuffs.push({ mesh: s, life: 0.6 + Math.random() * 0.3, grow: 1.2 + Math.random() * 1.5 });
  }
  function updateSmoke(dt) {
    for (var i = smokePuffs.length - 1; i >= 0; i--) {
      var s = smokePuffs[i];
      s.life -= dt;
      s.mesh.scale.multiplyScalar(1 + s.grow * dt);
      s.mesh.material.opacity = Math.max(0, s.life * 0.7);
      if (s.life <= 0) { R.scene.remove(s.mesh); smokePuffs.splice(i, 1); }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  爆発強化：'explosion' イベントに破片・衝撃波・発光コアを上乗せ
  // ════════════════════════════════════════════════════════════
  var fxList = [];
  var fragGeo = new THREE.TetrahedronGeometry(1);                 // スケールで都度サイズ調整
  var fragMat = new THREE.MeshPhongMaterial({ color: 0x9099a4, emissive: 0x221100, shininess: 80 });

  GAME.on('explosion', function (d) {
    if (!d || !d.pos) return;
    var pos = d.pos.clone ? d.pos.clone() : new THREE.Vector3(d.pos.x, d.pos.y, d.pos.z);
    var size = d.size || 1;
    var color = (d.color != null) ? d.color : 0xffaa33;
    var up = pos.clone().normalize();                             // 地球中心→外向き（破片の擬似重力）

    // 破片（金属片）
    var nF = clamp(Math.round(size * 3), 2, 14);
    var fragments = [];
    for (var i = 0; i < nF; i++) {
      var f = new THREE.Mesh(fragGeo, fragMat);
      f.scale.setScalar(0.025 * size);
      f.position.copy(pos);
      R.scene.add(f);
      fragments.push({
        mesh: f,
        vel: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize().multiplyScalar((0.2 + Math.random() * 0.3) * size),
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.4)
      });
    }

    // 煙（共有システムへ）
    var nS = clamp(Math.round(size * 1.5), 1, 6);
    for (var j = 0; j < nS; j++) {
      var sp = pos.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.1 * size));
      spawnSmokePuff(sp, 0.06 * size, 0x333333);
    }

    // 発光コア（白く膨らみフェード）
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 * size, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.position.copy(pos); R.scene.add(core);

    // 衝撃波（膨張する半透明シェル）
    var shock = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 * size, 16, 12),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    shock.position.copy(pos); R.scene.add(shock);

    fxList.push({ fragments: fragments, core: core, shock: shock, up: up, size: size, life: 1 });
  });

  function updateFx(dt) {
    for (var i = fxList.length - 1; i >= 0; i--) {
      var ex = fxList[i];
      ex.life -= dt * 1.6;
      var t = Math.max(0, ex.life);
      ex.fragments.forEach(function (f) {
        f.vel.addScaledVector(ex.up, -0.6 * dt);                  // 外向き重力（落下風）
        f.vel.multiplyScalar(0.96);
        f.mesh.position.add(f.vel.clone().multiplyScalar(dt * 60));
        f.mesh.rotation.x += f.spin.x; f.mesh.rotation.y += f.spin.y; f.mesh.rotation.z += f.spin.z;
      });
      ex.core.scale.setScalar(0.4 + t * 1.4);
      ex.core.material.opacity = t;
      ex.shock.scale.setScalar(1 + (1 - t) * 6);
      ex.shock.material.opacity = t * 0.5;
      if (ex.life <= 0) {
        ex.fragments.forEach(function (f) { R.scene.remove(f.mesh); });
        R.scene.remove(ex.core); R.scene.remove(ex.shock);
        fxList.splice(i, 1);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  画面シェイク：'playerHit' でカメラを揺らす
  // ════════════════════════════════════════════════════════════
  var shake = 0;
  GAME.on('playerHit', function (d) {
    var n = (d && d.n) || 10;
    shake = Math.min(0.6, shake + n * 0.014);                     // ダメージ量に比例・上限あり
  });
  function applyShake(dt) {
    if (shake <= 0) return;
    var cam = R.camera;                                           // updateCamera の後に走るので上書きOK
    cam.position.x += (Math.random() - 0.5) * shake;
    cam.position.y += (Math.random() - 0.5) * shake;
    cam.position.z += (Math.random() - 0.5) * shake;
    shake *= Math.max(0, 1 - dt * 9);                             // 指数減衰
    if (shake < 0.002) shake = 0;
  }

  // ════════════════════════════════════════════════════════════
  //  新敵：誘導ミサイル
  // ════════════════════════════════════════════════════════════
  var ER = 10;                                                   // 地球半径（index.html の const ER = 10 と一致）
  var missiles = [];
  var missileTimer = 8;                                           // 初回まで少し猶予
  var missileBodyMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, emissive: 0x330000, shininess: 60 });
  var missileNoseMat = new THREE.MeshPhongMaterial({ color: 0xff3322, emissive: 0x551100 });
  var missileTailMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });

  function mkMissile() {
    var g = new THREE.Group();
    // 進行方向 = lookAt 規約に合わせ -Z（lookAt(進行先) でノーズが対象を向く）
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), missileBodyMat);
    body.rotation.x = Math.PI / 2;
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), missileNoseMat);
    nose.rotation.x = -Math.PI / 2; nose.position.z = -0.085;
    var tail = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), missileTailMat);
    tail.position.z = 0.07;
    g.add(body); g.add(nose); g.add(tail);
    g.add(new THREE.PointLight(0xff5522, 1.4, 1.6));
    return g;
  }

  function spawnMissile() {
    var m = mkMissile();
    var player = R.playerGroup.position;
    var origin;
    var bases = R.bases;
    if (bases && bases.length > 0) {
      origin = bases[Math.floor(Math.random() * bases.length)].mesh.position.clone();
      origin.setLength(ER + 0.12);
    } else {
      var pAlt = player.length() - ER;
      origin = player.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(6));
      origin.setLength(ER + Math.max(0.3, pAlt * 0.5));
    }
    m.position.copy(origin);
    R.scene.add(m);
    var dir = player.clone().sub(origin).normalize();
    // speed: 通常UFO(0.035)より速いがブースト(0.08)で振り切れる / turn: 旋回追従の強さ（回避可能）
    missiles.push({ mesh: m, dir: dir, speed: 0.05, turn: 2.0, life: 9, trailT: 0 });
    R.showWarn('🚀 誘導ミサイル接近！回避せよ！');
  }

  function updateMissiles(dt) {
    var player = R.playerGroup.position;
    missileTimer -= dt;
    if (R.playerHP > 0 && missileTimer <= 0 && missiles.length < 4) {
      spawnMissile();
      missileTimer = 6 + Math.random() * 5;
    }
    var bullets = R.bullets;
    for (var i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i];
      m.life -= dt;
      // ホーミング：希望方向へ向きを徐々に補間（旋回レート制限＝回避可能）
      var desired = player.clone().sub(m.mesh.position).normalize();
      m.dir.lerp(desired, Math.min(1, m.turn * dt)).normalize();
      m.mesh.position.addScaledVector(m.dir, m.speed * dt * 60);
      m.mesh.lookAt(m.mesh.position.clone().add(m.dir));
      // 排煙トレイル
      m.trailT -= dt;
      if (m.trailT <= 0) { spawnSmokePuff(m.mesh.position.clone(), 0.025, 0x888888); m.trailT = 0.045; }
      // プレイヤー命中
      if (m.mesh.position.distanceTo(player) < 0.4) {
        R.damage(15);
        R.explode(m.mesh.position.clone(), 1.4, 0xff5522);
        R.scene.remove(m.mesh); missiles.splice(i, 1); continue;
      }
      // プレイヤー弾で迎撃可能（小判定・撃墜でスコア）
      var downed = false;
      if (bullets) {
        for (var j = bullets.length - 1; j >= 0; j--) {
          if (bullets[j].mesh.position.distanceTo(m.mesh.position) < 0.28) {
            R.explode(m.mesh.position.clone(), 1.0, 0xffcc44);
            R.scene.remove(bullets[j].mesh); bullets.splice(j, 1);
            R.addScore(120);
            downed = true; break;
          }
        }
      }
      if (downed) { R.scene.remove(m.mesh); missiles.splice(i, 1); continue; }
      // 寿命切れ / 地表めり込み
      if (m.life <= 0 || m.mesh.position.length() < ER + 0.05) {
        R.explode(m.mesh.position.clone(), 0.9, 0xff8844);
        R.scene.remove(m.mesh); missiles.splice(i, 1);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  戦闘機AI修正 ②③：常時移動＋距離で「接近／旋回」2モード（位置を毎フレーム上書き）
  // ════════════════════════════════════════════════════════════
  var FIGHTER_ALT_MIN = 0.3;     // 飛行高度の下限（地表へ潜らない）
  var FIGHTER_ALT_MAX = 0.6;     // 飛行高度の上限（内蔵の巡航高度 ~0.5-0.6 に合わせる）
  var ORBIT_RADIUS = 0.8;        // 旋回半径（地表接線距離）
  var NEAR = 1.1;                // この距離以下で旋回モードへ
  function updateFighterAI(dt) {
    var enemies = R.enemies;
    if (!enemies || enemies.length === 0) return;
    var player = R.playerGroup.position;
    var playerAlt = player.length() - ER;
    // 飛行高度：低空のプレイヤーには降りて追う／高高度時は上限で旋回（内蔵巡航帯を踏襲）
    var flightAlt = clamp(playerAlt * 0.8 + 0.1, FIGHTER_ALT_MIN, FIGHTER_ALT_MAX);
    var step = dt * 60;                                             // 内蔵AIに合わせフレーム基準
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.mesh) continue;
      if (e._orbitDir === undefined) e._orbitDir = (Math.random() < 0.5) ? 1 : -1; // 旋回向きを固定
      var ePos = e.mesh.position;
      var up = ePos.clone().normalize();                           // 機体直下の地表法線
      // プレイヤーへの接線方向（地表面に投影＝水平距離）
      var toP = player.clone().sub(ePos);
      var tang = toP.clone().addScaledVector(up, -toP.dot(up));
      var horiz = tang.length();
      if (horiz < 1e-4) { tang = new THREE.Vector3(0, 1, 0).cross(up); horiz = tang.length() || 1; }
      tang.normalize();
      var speed = Math.max(0.02, e.speed || 0.02);                 // ★常に最低速度（停止しない）
      var moveDir;
      if (horiz > NEAR) {
        // 遠い → 接近
        moveDir = tang;
      } else {
        // 近い → 旋回（接線に直交する向き＝周回）。半径維持の微補正を加える
        var around = up.clone().cross(tang).multiplyScalar(e._orbitDir);
        var radial = tang.clone().multiplyScalar((horiz - ORBIT_RADIUS) * 0.6); // 半径へ寄せる
        moveDir = around.add(radial).normalize();
      }
      ePos.addScaledVector(moveDir, speed * step);
      ePos.setLength(ER + flightAlt);                              // 高度を飛行帯に固定（潜行/停止防止）
      e.mesh.lookAt(player);                                       // プレイヤーへ正対（射撃方向）
    }
  }

  // ════════════════════════════════════════════════════════════
  //  ① 戦車の陸地拘束（1号機提供 GAME.isLand を使用）
  //     地表ユニットは静的なので、陸/海マスク準備後に一度だけ海上の戦車を最寄りの陸へ移設。
  //     ※ 戦艦(ship)は海でOK・遺跡(landmark)は固定なので対象外。
  //     ※ 移動するロボ(gundam)は superEnemies が GAME.refs に未公開のため本モジュールでは未対応
  //        → 1号機に refs.superEnemies 追加を依頼中（追加され次第ここで同様に拘束予定）。
  // ════════════════════════════════════════════════════════════
  function posToLatLon(p) {
    var r = p.length();
    var lat = Math.asin(clamp(p.y / r, -1, 1)) * 180 / Math.PI;
    var lon = Math.atan2(p.z, -p.x) * 180 / Math.PI;            // index.html checkZone と同一規約
    return { lat: lat, lon: lon };
  }
  function orientOnSurface(mesh) {
    var up = mesh.position.clone().normalize();
    var east = new THREE.Vector3(0, 1, 0).cross(up);
    if (east.lengthSq() < 0.001) east.set(1, 0, 0);
    east.normalize();
    var north = up.clone().cross(east).normalize();
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, up, north)); // placeOnSurface と同等
  }
  function bindTanksToLand() {
    var gu = R.groundUnits;
    if (!gu) return;
    var moved = 0;
    for (var i = 0; i < gu.length; i++) {
      var u = gu[i];
      if (u.type !== 'tank' || !u.mesh) continue;
      var pos = u.mesh.position;
      if (GAME.isLand(posToLatLon(pos).lat, posToLatLon(pos).lon)) continue;  // 既に陸ならOK
      // 海 → 地表に沿って周囲を探索し最寄りの陸へ移設
      var up = pos.clone().normalize();
      var east = new THREE.Vector3(0, 1, 0).cross(up);
      if (east.lengthSq() < 0.001) east.set(1, 0, 0);
      east.normalize();
      var north = up.clone().cross(east).normalize();
      var found = null;
      for (var deg = 1; deg <= 8 && !found; deg++) {
        for (var a = 0; a < 360; a += 30) {
          var rad = a * Math.PI / 180;
          var dir = east.clone().multiplyScalar(Math.cos(rad)).add(north.clone().multiplyScalar(Math.sin(rad)));
          var axis = up.clone().cross(dir).normalize();          // この軸で回すと dir 方向へ地表移動
          var cand = pos.clone().applyAxisAngle(axis, deg * Math.PI / 180);
          var cll = posToLatLon(cand);
          if (GAME.isLand(cll.lat, cll.lon)) { found = cand; break; }
        }
      }
      if (found) { u.mesh.position.copy(found); orientOnSurface(u.mesh); moved++; }
    }
    if (moved > 0) console.log('[3号機] 海上の戦車を陸地へ移設:', moved + '台');
  }
  var landBindDone = false;
  function tryBindTanks() {
    if (landBindDone) return;
    if (GAME.isLand(0, -150)) return;   // 既知の海(太平洋中部)が陸=true の間はマスク未準備
    landBindDone = true;
    bindTanksToLand();
  }

  // ════════════════════════════════════════════════════════════
  //  毎フレーム集約（1本の onUpdate に集約）
  // ════════════════════════════════════════════════════════════
  GAME.onUpdate(function (dt) {
    tryBindTanks();        // ① 戦車の陸地拘束（マスク準備後に一度だけ実行）
    updateFighterAI(dt);   // 内蔵戦闘機AIの後に位置を上書き（②③修正）
    updateMissiles(dt);    // 新敵：誘導ミサイル
    updateSmoke(dt);       // 煙
    updateFx(dt);          // 爆発上乗せ演出
    applyShake(dt);        // 被弾シェイク（updateCamera の後・render の前）
  });

  console.log('[3号機] FX/新敵モジュール 読込完了（誘導ミサイル・爆発強化・画面シェイク・戦闘機AI修正）');
})();
