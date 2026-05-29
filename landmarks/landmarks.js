/* =============================================================================
 * UFO地球侵略ゲーム — 追加ランドマーク6つ（4号機担当）
 * 既存ランドマーク(mkPyramid)と同方式の「手描き Three.js(r128)」ジオメトリ。
 *   各 mkXxx() は THREE.Group を返す（局所 +Y=上、底面 y≈0、MeshPhongMaterial）。
 *   placeOnSurface(g, lat, lon) で実在の緯度経度に配置し、groundUnits へ
 *   type:'landmark', hp:999 で登録する。これだけで↓が全て自動的に満たされる:
 *     ・破壊不可（hit時 type==='landmark' で「神聖な遺跡には傷ひとつ付かない！」）
 *     ・ロックオン/攻撃対象外（attackable = groundUnits.filter(type!=='landmark')）
 *     ・自転追従（loop が毎フレーム groundUnits[].mesh を _earthSpin で回す＝
 *       earthMesh の子にせずワールド座標を保つ既存方式に自動で乗る）
 *
 * 統合: 1号機が embed.py で単一HTMLへインライン化（index.html は無改変）。
 *   既存グローバル placeOnSurface / GAME.refs.{scene,groundUnits} に乗るだけ。
 * ============================================================================= */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') { return; }
  var T = THREE;
  function phong(color, shin) { return new T.MeshPhongMaterial({ color: color, shininess: shin || 8 }); }

  // ── 1. 万里の長城（八達嶺付近・尾根を蛇行する城壁＋望楼）────────────────
  function mkGreatWall() {
    var g = new T.Group();
    var wall = phong(0x8a8275, 4), top = phong(0x6f675a, 4);
    var N = 10, span = 1.9;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var x = (t - 0.5) * span;
      var z = Math.sin(t * Math.PI * 2) * 0.18;
      var z2 = Math.sin((t + 0.02) * Math.PI * 2) * 0.18;
      var ang = Math.atan2(z2 - z, span / (N - 1));
      var seg = new T.Mesh(new T.BoxGeometry(0.24, 0.14, 0.085), wall);
      seg.position.set(x, 0.07, z); seg.rotation.y = ang; g.add(seg);
      var cren = new T.Mesh(new T.BoxGeometry(0.24, 0.035, 0.095), top);  // 上部の狭間
      cren.position.set(x, 0.155, z); cren.rotation.y = ang; g.add(cren);
    }
    [-0.66, 0.0, 0.66].forEach(function (tx) {           // 望楼3基
      var t = tx / span + 0.5, z = Math.sin(t * Math.PI * 2) * 0.18;
      var tw = new T.Mesh(new T.BoxGeometry(0.15, 0.26, 0.15), wall);
      tw.position.set(tx, 0.13, z); g.add(tw);
      var rf = new T.Mesh(new T.BoxGeometry(0.18, 0.04, 0.18), top);
      rf.position.set(tx, 0.28, z); g.add(rf);
    });
    return g;
  }

  // ── 2. モアイ（イースター島・アフー台座に石像が整列）──────────────────
  function mkMoai() {
    var g = new T.Group();
    var stone = phong(0x9a9288, 3), ahu = phong(0x55504a, 2), pukao = phong(0x7a3b2a, 4);
    var base = new T.Mesh(new T.BoxGeometry(1.0, 0.12, 0.24), ahu);
    base.position.y = 0.06; g.add(base);
    for (var i = 0; i < 5; i++) {
      var x = -0.4 + i * 0.2, by = 0.12;
      var body = new T.Mesh(new T.BoxGeometry(0.13, 0.30, 0.10), stone);
      body.position.set(x, by + 0.15, 0); g.add(body);
      var head = new T.Mesh(new T.BoxGeometry(0.115, 0.13, 0.10), stone);
      head.position.set(x, by + 0.35, 0.006); g.add(head);
      var nose = new T.Mesh(new T.BoxGeometry(0.04, 0.11, 0.045), stone);  // 鼻/額の張り出し
      nose.position.set(x, by + 0.33, 0.065); g.add(nose);
      if (i % 2 === 0) {                                  // プカオ(赤い帽子)
        var p = new T.Mesh(new T.CylinderGeometry(0.052, 0.052, 0.05, 10), pukao);
        p.position.set(x, by + 0.45, 0); g.add(p);
      }
    }
    return g;
  }

  // ── 3. タージマハル（白亜のドーム＋4ミナレット・左右対称）──────────────
  function mkTajMahal() {
    var g = new T.Group();
    var white = phong(0xf2efe9, 30), gold = phong(0xd9c36a, 70);
    var dome = function (r) { return new T.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62); };
    var plinth = new T.Mesh(new T.BoxGeometry(1.0, 0.08, 1.0), white); plinth.position.y = 0.04; g.add(plinth);
    var body = new T.Mesh(new T.BoxGeometry(0.6, 0.34, 0.6), white); body.position.y = 0.25; g.add(body);
    var d = new T.Mesh(dome(0.26), white); d.position.y = 0.42; d.scale.y = 1.25; g.add(d);
    var spire = new T.Mesh(new T.ConeGeometry(0.03, 0.13, 8), gold); spire.position.y = 0.78; g.add(spire);
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        var mh = 0.62;
        var min = new T.Mesh(new T.CylinderGeometry(0.034, 0.04, mh, 10), white);
        min.position.set(sx * 0.46, 0.08 + mh / 2, sz * 0.46); g.add(min);
        var cap = new T.Mesh(dome(0.05), white); cap.position.set(sx * 0.46, 0.08 + mh, sz * 0.46); g.add(cap);
        var cd = new T.Mesh(dome(0.075), white); cd.position.set(sx * 0.22, 0.42, sz * 0.22); g.add(cd); // 隅の小ドーム
      });
    });
    return g;
  }

  // ── 4. ピサの斜塔（円筒多層をわざと ~5° 傾ける）──────────────────────
  function mkPisaTower() {
    var g = new T.Group();
    var marble = phong(0xeee8dc, 22), gal = phong(0xdcd5c4, 22);
    var lean = new T.Group(); lean.rotation.z = 0.09;     // ~5°の傾斜が肝
    var tiers = 8, h = 0.075, r = 0.155, y = 0;
    for (var i = 0; i < tiers; i++) {
      var drum = new T.Mesh(new T.CylinderGeometry(r, r, h, 16), marble);
      drum.position.y = y + h / 2; lean.add(drum);
      var ring = new T.Mesh(new T.CylinderGeometry(r * 1.05, r * 1.05, h * 0.45, 16), gal); // ガレリア(柱列)
      ring.position.y = y + h * 0.5; lean.add(ring);
      y += h;
    }
    var bell = new T.Mesh(new T.CylinderGeometry(0.12, 0.13, 0.08, 16), marble);
    bell.position.y = y + 0.04; lean.add(bell);
    g.add(lean);
    return g;
  }

  // ── 5. シドニーオペラハウス（白い貝殻状シェルが連なる屋根）──────────────
  function mkOperaHouse() {
    var g = new T.Group();
    var white = phong(0xeeeae2, 45), pod = phong(0xcfc9bf, 8);
    var podium = new T.Mesh(new T.BoxGeometry(1.0, 0.10, 0.6), pod); podium.position.y = 0.05; g.add(podium);
    function shell(x, z, s, ry) {                          // 帆=半球を縦に潰し傾ける
      var sh = new T.Mesh(new T.SphereGeometry(0.22 * s, 14, 10, 0, Math.PI, 0, Math.PI), white);
      sh.scale.set(0.5, 1.5, 1.0);
      sh.rotation.set(0.5, ry || 0, 0);
      sh.position.set(x, 0.10, z); g.add(sh);
    }
    // 2クラスタ（湾に面して連なる）
    [[-0.30, 0.02, 1.0, 0.2], [-0.14, 0.06, 0.8, 0.1], [-0.02, 0.0, 0.6, 0.0],
     [0.30, 0.02, 1.0, -0.2], [0.16, 0.06, 0.8, -0.1], [0.04, 0.0, 0.6, 0.0]
    ].forEach(function (c) { shell(c[0], c[1], c[2], c[3]); });
    return g;
  }

  // ── 6. コロッセオ（楕円アーチ壁・一部崩れ）──────────────────────────
  function mkColosseum() {
    var g = new T.Group();
    var s1 = phong(0xc8b89a, 4), s2 = phong(0xb0a184, 4);
    var N = 22, rx = 0.6, rz = 0.42;
    for (var i = 0; i < N; i++) {
      if (i >= 15 && i <= 18) continue;                    // 崩れた区画
      var a = i / N * Math.PI * 2;
      var x = Math.cos(a) * rx, z = Math.sin(a) * rz;
      var hTop = (i >= 12 && i <= 20) ? 0.22 : 0.34;        // 崩れ際は低く
      var pil = new T.Mesh(new T.BoxGeometry(0.1, hTop, 0.07), i % 2 ? s1 : s2);
      pil.position.set(x, hTop / 2, z); pil.rotation.y = -a; g.add(pil);
      if (hTop > 0.25) {                                    // 上層の梁(アーチ列の示唆)
        var beam = new T.Mesh(new T.BoxGeometry(0.1, 0.03, 0.06), s2);
        beam.position.set(x, 0.20, z); beam.rotation.y = -a; g.add(beam);
      }
    }
    var inner = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.08, 24, 1, true), s1); // アリーナ内壁
    inner.scale.set(1, 1, 0.7); inner.position.y = 0.04; g.add(inner);
    return g;
  }

  // ── 配置定義（緯度経度＝実在地点）─────────────────────────────────
  var LANDMARKS = [
    { make: mkGreatWall,  lat: 40.43,  lon: 116.57, country: '中国（万里の長城）',           color: 0x8a8275, scale: 1.0 },
    { make: mkMoai,       lat: -27.12, lon: -109.37, country: 'イースター島（モアイ）',       color: 0x9a9288, scale: 0.85 },
    { make: mkTajMahal,   lat: 27.17,  lon: 78.04,  country: 'インド（タージマハル）',        color: 0xf2efe9, scale: 0.95 },
    { make: mkPisaTower,  lat: 43.72,  lon: 10.40,  country: 'イタリア（ピサの斜塔）',        color: 0xeee8dc, scale: 0.95 },
    { make: mkOperaHouse, lat: -33.86, lon: 151.21, country: 'オーストラリア（オペラハウス）', color: 0xeeeae2, scale: 1.0 },
    { make: mkColosseum,  lat: 41.89,  lon: 12.49,  country: 'イタリア（コロッセオ）',        color: 0xc8b89a, scale: 1.0 }
  ];

  var added = false;
  function addLandmarks() {
    if (added) return true;
    var refs = (typeof GAME !== 'undefined' && GAME.refs) ? GAME.refs : null;
    var scene = refs ? refs.scene : (typeof window !== 'undefined' ? window.scene : null);
    var gu = refs ? refs.groundUnits : (typeof window !== 'undefined' ? window.groundUnits : null);
    if (!scene || !gu || typeof placeOnSurface !== 'function') return false; // まだ準備前
    added = true;
    for (var i = 0; i < LANDMARKS.length; i++) {
      var L = LANDMARKS[i];
      var grp = L.make();
      placeOnSurface(grp, L.lat, L.lon);     // 既存グローバル：実在緯度経度へ
      grp.scale.setScalar(L.scale);
      scene.add(grp);
      // groundUnits 登録 → 破壊不可・ロックオン除外・自転追従が自動適用
      gu.push({ mesh: grp, hp: 999, type: 'landmark', country: L.country, color: L.color });
    }
    if (typeof log === 'function') log('🗿 追加ランドマーク6基 配置完了');
    return true;
  }

  // GAME 準備後に一度だけ実行（embed/script順に依存しないよう多重に保険）
  if (!addLandmarks()) {
    if (typeof GAME !== 'undefined' && GAME.onUpdate) {
      GAME.onUpdate(function () { if (!added) addLandmarks(); });
    } else {
      var n = 0;
      var iv = setInterval(function () { if (addLandmarks() || ++n > 200) clearInterval(iv); }, 100);
    }
  }
})();
