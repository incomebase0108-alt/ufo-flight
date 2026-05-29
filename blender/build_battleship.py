# -*- coding: utf-8 -*-
"""【4号機担当】戦艦（大和型イメージ）。全長~0.60(X方向)、キール Z=0、up=+Z。
喫水下=赤/上=ライトグレーの2トーン、艦首は前方(+X)へ尖る、中央やや後方にパゴダ艦橋、
大煙突1本、三連装主砲3基(前2背負い式・後1)、マスト灯/艦尾灯=TINT_GLOW_light。
SPEC.md の「① 戦艦」記述を参照。common.py の cube/cyl/cone/sphere/bevel で組む。
最後に join_all_except("battleship") → export("battleship.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

HALF = math.pi / 2

# ── マテリアル ──
hull_gray = mat("hull_gray", color=(0.34, 0.36, 0.38), metallic=0.3, rough=0.6)
hull_red  = mat("hull_red",  color=(0.50, 0.07, 0.07), metallic=0.1, rough=0.7)
deck_tan  = mat("deck_tan",  color=(0.42, 0.37, 0.28), metallic=0.0, rough=0.8)  # 木甲板
steel     = mat("steel",     color=(0.28, 0.30, 0.32), metallic=0.5, rough=0.5)
barrel_m  = mat("barrel",    color=(0.20, 0.22, 0.24), metallic=0.6, rough=0.4)
light     = mat("TINT_GLOW_light", color=(1.0, 0.6, 0.2), emission=(1.0, 0.6, 0.2), em_strength=6.0)

WL = 0.05     # 喫水線 Z
DECK = 0.085  # 上甲板 Z

# ── 船体（中央の箱体）──
# 喫水下=赤
cube("hull_lo", (0.46, 0.105, 0.05), (-0.03, 0, 0.025), hull_red)
# 喫水上(乾舷)=グレー
cube("hull_up", (0.46, 0.10, 0.035), (-0.03, 0, 0.0675), hull_gray)
# 木甲板（薄板）
cube("deck", (0.45, 0.092, 0.006), (-0.03, 0, DECK + 0.002), deck_tan)

# ── 艦首（+X へ尖る・ダイヤ型プロウ）──
# 45°回した箱の前角が +0.30 まで突き出して鋭い艦首になる
cube("bow_lo", (0.075, 0.075, 0.05),  (0.245, 0, 0.025),  hull_red,  rot=(0, 0, HALF / 2))
cube("bow_up", (0.075, 0.075, 0.035), (0.245, 0, 0.0675), hull_gray, rot=(0, 0, HALF / 2))

# ── 艦尾（やや角ばる：小さな段差ブロック）──
cube("stern", (0.05, 0.085, 0.045), (-0.275, 0, 0.06), hull_gray)

# ── パゴダ艦橋（中央やや後方 X=-0.06、上へ細く数段積み）──
bx = -0.06
cube("bridge1", (0.05,  0.07,  0.040), (bx, 0, DECK + 0.020), hull_gray)
cube("bridge2", (0.04,  0.055, 0.035), (bx, 0, DECK + 0.0575), hull_gray)
cube("bridge3", (0.030, 0.040, 0.030), (bx, 0, DECK + 0.090), hull_gray)
cube("bridge4", (0.022, 0.030, 0.025), (bx, 0, DECK + 0.1175), steel)
# 測距儀（頂部の横長小箱）
cube("rangefinder", (0.040, 0.018, 0.012), (bx, 0, DECK + 0.135), steel)
# 細いマスト
cyl("mast", 0.004, 0.07, (bx, 0, DECK + 0.175), steel)
# マスト灯（TINT_GLOW）
sphere("mast_light", 0.006, (bx, 0, DECK + 0.210), light, seg=12, ring=8)

# ── 大煙突1本（艦橋の後ろ・やや後傾の太い円柱）──
fx = -0.135
cyl("funnel", 0.024, 0.075, (fx, 0, DECK + 0.040), steel, rot=(0, -0.16, 0))
cyl("funnel_cap", 0.028, 0.012, (fx + 0.012, 0, DECK + 0.078), steel, rot=(0, -0.16, 0))

# ── 三連装主砲塔（前2基=背負い式 + 艦尾1基）──
# 砲身は cyl 既定 Z 軸 → rot=(0,HALF,0) で X 軸方向（前後）に寝かせる
def make_turret(name, x, z, fwd=True):
    """低いハウジング + 三連装の砲身。fwd=True で +X へ、False で -X(艦尾) へ。"""
    cube(name + "_h", (0.05, 0.058, 0.028), (x, 0, z), steel)
    d = 1.0 if fwd else -1.0
    bx0 = x + d * 0.045
    for i, dy in enumerate((-0.013, 0.0, 0.013)):
        cyl("%s_b%d" % (name, i), 0.005, 0.07, (bx0, dy, z + 0.004),
            barrel_m, rot=(0, HALF, 0))

make_turret("turA", 0.105, DECK + 0.018, fwd=True)   # 前・低
make_turret("turB", 0.040, DECK + 0.035, fwd=True)   # 前・高（背負い式）
make_turret("turC", -0.175, DECK + 0.018, fwd=False)  # 艦尾・後ろ向き

# ── 副砲・対空機銃（甲板上に小円柱を散らす）──
for i, (sx, sy) in enumerate([(-0.20, 0.03), (-0.20, -0.03), (-0.10, 0.035),
                               (-0.10, -0.035), (0.0, 0.03), (0.0, -0.03)]):
    cyl("aa_%d" % i, 0.006, 0.014, (sx, sy, DECK + 0.010), steel, verts=10)

# ── 艦尾灯（TINT_GLOW）──
sphere("stern_light", 0.006, (-0.295, 0, DECK + 0.012), light, seg=12, ring=8)

# ── 箱物の角を軽く丸める ──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and ("hull" in ob.name or "bridge" in ob.name
                              or "stern" == ob.name or "deck" == ob.name
                              or "bow" in ob.name or "_h" in ob.name):
        bevel(ob, width=0.0035, segments=2)

join_all_except("battleship")
export("battleship.glb")
