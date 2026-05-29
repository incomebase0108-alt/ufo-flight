# -*- coding: utf-8 -*-
"""【4号機担当】空軍基地（滑走路）。滑走路全長~2.4(X方向)、司令塔高さ~1.0、接地 Z=0、up=+Z。
長い滑走路(濃アスファルト+白破線)・誘導路・駐機場・格納庫数棟・司令塔ビル+アンテナ、
司令塔頂部の警告灯=TINT_GLOW_light、敷地フチに緑(芝)の点。SPEC.md の「② 基地」記述を参照。
最後に join_all_except("base") → export("base.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

# ── マテリアル ──
ground   = mat("ground",   color=(0.20, 0.26, 0.17), rough=0.95)            # 敷地(土/芝下地)
asphalt  = mat("asphalt",  color=(0.12, 0.12, 0.13), rough=0.9)             # 滑走路
taxi     = mat("taxi",     color=(0.17, 0.17, 0.19), rough=0.9)             # 誘導路
apron    = mat("apron",    color=(0.52, 0.53, 0.55), rough=0.85)            # 駐機場
white    = mat("white",    color=(0.90, 0.90, 0.88), rough=0.7)            # 白線
building = mat("building", color=(0.62, 0.64, 0.68), metallic=0.2, rough=0.6)
hangar_m = mat("hangar",   color=(0.50, 0.55, 0.60), metallic=0.45, rough=0.5)
grass    = mat("grass",    color=(0.18, 0.45, 0.16), rough=0.9)
antenna_m = mat("antenna", color=(0.30, 0.32, 0.34), metallic=0.6, rough=0.4)
light    = mat("TINT_GLOW_light", color=(1.0, 0.3, 0.2), emission=(1.0, 0.3, 0.2), em_strength=6.0)

# ── 敷地（大きな薄い平板・Z=0 接地）──
cube("site", (2.6, 1.30, 0.012), (0, 0, 0.006), ground)

# ── 滑走路（濃アスファルトの長い平板・全長~2.4）──
cube("runway", (2.4, 0.18, 0.014), (0, 0.0, 0.013), asphalt)
# 中央の白い破線（X方向に並ぶ）
n = 13
for i in range(n):
    x = -1.08 + i * (2.16 / (n - 1))
    cube("rwline_%d" % i, (0.085, 0.014, 0.003), (x, 0, 0.021), white)
# 滑走路端マーク（しきい）
for sx in (-1.16, 1.16):
    for dy in (-0.06, -0.02, 0.02, 0.06):
        cube("thr_%d_%d" % (int(sx), int(dy * 100)), (0.05, 0.012, 0.003), (sx, dy, 0.021), white)

# ── 誘導路（滑走路に並走）──
cube("taxiway", (2.0, 0.11, 0.013), (0, 0.34, 0.0125), taxi)

# ── 駐機場（エプロン・横に広がる白〜灰の板）──
cube("apron", (0.62, 0.46, 0.013), (-0.72, 0.50, 0.0125), apron)

# ── 格納庫（かまぼこ型＝X軸に寝かせた円筒）数棟 ──
def hangar(name, x, y, length=0.17, r=0.05):
    cyl(name, r, length, (x, y, r), hangar_m, rot=(0, math.pi / 2, 0), verts=20)
    # 妻壁（半円の前後フタ）
    cube(name + "_w1", (0.012, r * 2, r * 2), (x + length / 2, y, r), hangar_m)
    cube(name + "_w2", (0.012, r * 2, r * 2), (x - length / 2, y, r), hangar_m)

hangar("hangarA", -0.62, 0.52)
hangar("hangarB", -0.80, 0.52)
hangar("hangarC", -0.98, 0.52)

# ── 司令塔ビル（高さ~1.0 の縦長の箱）＋管制室＋アンテナ ──
tx, ty = -1.05, 0.18
cube("tower", (0.11, 0.11, 1.0), (tx, ty, 0.50), building)
# 頂部の少し張り出した管制室
cube("tower_cab", (0.17, 0.17, 0.09), (tx, ty, 0.955), building)
# アンテナ塔
cyl("ant_mast", 0.005, 0.18, (tx, ty, 1.09), antenna_m)
# 司令塔頂部の警告灯（TINT_GLOW）
sphere("tower_light", 0.014, (tx, ty, 1.005), light, seg=14, ring=10)
sphere("ant_light", 0.008, (tx, ty, 1.185), light, seg=12, ring=8)

# ── 敷地フチの緑（芝/植栽の点）──
edge = [(-1.2, -0.55), (-0.7, -0.58), (-0.2, -0.56), (0.3, -0.57), (0.8, -0.55),
        (1.2, -0.5), (1.25, 0.5), (0.9, 0.58), (0.4, 0.6), (-0.1, 0.59),
        (1.15, 0.0), (-1.25, 0.2), (-1.25, -0.2)]
for i, (gx, gy) in enumerate(edge):
    sphere("grass_%d" % i, 0.045, (gx, gy, 0.012), grass, scale=(1, 1, 0.25), seg=12, ring=8)

# ── 箱物の角を軽く丸める（薄板は除外）──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and ("tower" in ob.name or "hangar" in ob.name):
        bevel(ob, width=0.004, segments=2)

join_all_except("base")
export("base.glb")
