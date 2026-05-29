# -*- coding: utf-8 -*-
"""【4号機担当】UFO母艦（敵ボス・巨大）。直径~3.0(半径~1.5)・厚み~1.0、中心=原点、up=+Z。
巨大円盤＋司令ドーム＋下部トラクタービーム発光口＋外周の回転リング/多数の窓灯火＋砲塔張り出し。
SF映画のマザーシップ風の重厚感。窓は発光マテリアル面で表現（穴あけ不要）。~250KB目安。
SPEC.md の「④ UFO母艦」記述を参照。最後に join_all_except("mothership") → export("mothership.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

R = 1.5  # 半径

# ── マテリアル ──
hull   = mat("ship_hull",  color=(0.27, 0.34, 0.41), metallic=0.7, rough=0.40)
panel  = mat("ship_panel", color=(0.16, 0.20, 0.25), metallic=0.8, rough=0.35)
dome_m = mat("ship_dome",  color=(0.45, 0.55, 0.66), metallic=0.5, rough=0.30)
ring_m = mat("ship_ring",  color=(0.30, 0.33, 0.38), metallic=0.9, rough=0.25)
turret = mat("ship_turret", color=(0.13, 0.15, 0.18), metallic=0.85, rough=0.3)
win    = mat("ship_window", color=(0.45, 0.80, 1.0), emission=(0.35, 0.70, 1.0), em_strength=4.0)
beam   = mat("ship_beam",   color=(0.5, 0.85, 1.0), emission=(0.4, 0.85, 1.0), em_strength=8.0)
core   = mat("ship_core",   color=(0.6, 0.9, 1.0), emission=(0.5, 0.9, 1.0), em_strength=10.0)

# ── 本体（円盤＝上ドーム / 中央リム / 下面テーパー）──
# 中央リム（厚い円盤）
cyl("rim", R, 0.22, (0, 0, 0.0), hull, verts=44)
# 上面ドーム（扁平半球）
sphere("top_dome", R * 0.98, (0, 0, 0.05), hull, scale=(1, 1, 0.32), seg=44, ring=12)
# 下面（下すぼまりの円錐＝艦底）
cone("under", R * 0.98, 0.42, 0.46, (0, 0, -0.26), hull, rot=(math.pi, 0, 0), verts=40)

# ── メカニカルなパネル分割（同心の薄いリングを上面に）──
for i, rr in enumerate((R * 0.45, R * 0.72, R * 0.92)):
    torus("panel_%d" % i, rr, 0.018, (0, 0, 0.10 + i * 0.02), panel, mseg=40, nseg=6)

# ── 司令ドーム（上部中央）＋頂部コア ──
sphere("cmd_dome", 0.42, (0, 0, 0.30), dome_m, scale=(1, 1, 0.78), seg=28, ring=12)
cyl("cmd_base", 0.46, 0.06, (0, 0, 0.22), panel, verts=28)
sphere("cmd_core", 0.10, (0, 0, 0.62), core, seg=16, ring=10)  # 頂部の発光コア

# ── 外周の回転リング（兵器然としたアウターリング）──
torus("outer_ring", R * 1.06, 0.07, (0, 0, 0.0), ring_m, mseg=48, nseg=8)
# リングを支えるステー（数本）
for i in range(8):
    a = i * math.pi / 4
    cube("stay_%d" % i, (0.06, 0.10, 0.05),
         (math.cos(a) * R * 1.02, math.sin(a) * R * 1.02, 0.0), ring_m, rot=(0, 0, a))

# ── 下部トラクタービーム発光口（艦底中央）──
cone("beam_port", 0.5, 0.16, 0.30, (0, 0, -0.48), turret, rot=(math.pi, 0, 0), verts=28)
cyl("beam_glow", 0.18, 0.04, (0, 0, -0.60), beam, verts=24)        # 発光ディスク
sphere("beam_orb", 0.12, (0, 0, -0.55), beam, seg=16, ring=10)     # ビーム源

# ── 多数の窓・灯火（リム外周にぐるり）──
NW = 34
for i in range(NW):
    a = i * 2 * math.pi / NW
    cube("win_%d" % i, (0.055, 0.05, 0.045),
         (math.cos(a) * (R * 0.99), math.sin(a) * (R * 0.99), 0.02), win, rot=(0, 0, a))
# 上ドーム上の小窓（2段）
for ring_i, (rr, zz, n) in enumerate(((R * 0.55, 0.28, 14), (R * 0.78, 0.18, 18))):
    for i in range(n):
        a = i * 2 * math.pi / n + ring_i * 0.1
        sphere("dwin_%d_%d" % (ring_i, i), 0.022,
               (math.cos(a) * rr, math.sin(a) * rr, zz), win, seg=6, ring=4)

# ── 砲塔の張り出し（リム周囲に数基・外向き）──
for i in range(6):
    a = i * math.pi / 3 + math.pi / 6
    bx, by = math.cos(a) * R * 1.0, math.sin(a) * R * 1.0
    cube("turhouse_%d" % i, (0.16, 0.16, 0.10), (bx, by, -0.02), turret, rot=(0, 0, a))
    # 砲身2本（外向き=半径方向）
    for dy in (-0.04, 0.04):
        ox = math.cos(a) * 0.14 - math.sin(a) * dy
        oy = math.sin(a) * 0.14 + math.cos(a) * dy
        cyl("turbarrel_%d_%d" % (i, int(dy * 100)), 0.018, 0.18,
            (bx + ox, by + oy, -0.02), turret, rot=(0, math.pi / 2, a), verts=12)

# ── 角を軽く丸める（大きめの箱物のみ・窓は除外して軽量化）──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and ("turhouse" in ob.name or "stay" in ob.name):
        bevel(ob, width=0.006, segments=1)

join_all_except("mothership")
export("mothership.glb")
