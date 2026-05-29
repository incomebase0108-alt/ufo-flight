# -*- coding: utf-8 -*-
"""【4号機担当】戦車（陸自90式イメージ）。全長~0.18、幅~0.10、高さ~0.09、接地 Z=0、up=+Z。
濃緑(迷彩)・低い車体・左右履帯(転輪片側6個)・傾斜砲塔・長い主砲身が前方(+X)へ・車長ハッチ/機銃/アンテナ。
着色TINTは不要（全マテリアル固定）。SPEC.md の「③ 戦車」記述を参照。
最後に join_all_except("tank") → export("tank.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

HALF = math.pi / 2

# ── マテリアル（全固定・TINT なし）──
green = mat("tank_green", color=(0.17, 0.23, 0.13), rough=0.8)   # 濃緑
olive = mat("tank_olive", color=(0.22, 0.26, 0.15), rough=0.8)   # 迷彩の明るい方
dark  = mat("tank_dark",  color=(0.06, 0.07, 0.06), rough=0.9)   # 履帯/暗部
metal = mat("tank_metal", color=(0.13, 0.14, 0.13), metallic=0.5, rough=0.5)  # 砲身

# ── 履帯（左右の長い箱・接地 Z=0）──
for side, sy in (("L", 0.040), ("R", -0.040)):
    cube("track_" + side, (0.165, 0.020, 0.030), (0, sy, 0.015), dark)
    # 転輪（片側6個・Y軸に寝かせた円柱が外面に覗く）
    for i in range(6):
        x = -0.060 + i * 0.024
        cyl("wheel_%s_%d" % (side, i), 0.012, 0.022, (x, sy, 0.013),
            metal, rot=(HALF, 0, 0), verts=14)
    # 起動輪/誘導輪（前後の少し大きい輪）
    for j, x in enumerate((-0.082, 0.082)):
        cyl("idler_%s_%d" % (side, j), 0.015, 0.021, (x, sy, 0.016),
            dark, rot=(HALF, 0, 0), verts=16)

# ── 車体（低い箱・履帯の間〜上）──
cube("hull", (0.135, 0.062, 0.028), (0, 0, 0.036), green)
# 前面傾斜（グレイシス・前上を斜めに削ぐ）
cube("glacis", (0.030, 0.062, 0.030), (0.073, 0, 0.040), green, rot=(0, -0.6, 0))
# 後部エンジンデッキ（少し低い段）
cube("enginedeck", (0.040, 0.060, 0.014), (-0.052, 0, 0.057), olive)

# ── 砲塔（平たく傾斜・前面が斜めに削げた箱）──
TZ = 0.066
cube("turret", (0.080, 0.058, 0.024), (-0.005, 0, TZ), olive)
# 砲塔前面の斜め装甲（くさび）
cube("turret_face", (0.026, 0.056, 0.026), (0.040, 0, TZ - 0.002), olive, rot=(0, -0.5, 0))
# 砲塔側面の増加装甲（平たい板）
for sy in (0.030, -0.030):
    cube("turret_skirt_%d" % int(sy * 100), (0.060, 0.006, 0.020), (-0.01, sy, TZ), green)

# ── 主砲身（長い細円柱が前方+Xへ水平に）──
cyl("gun", 0.0055, 0.105, (0.105, 0, TZ + 0.002), metal, rot=(0, HALF, 0), verts=18)
# 砲身基部の防盾（マントレット）
cube("mantlet", (0.014, 0.030, 0.024), (0.052, 0, TZ + 0.001), dark)
# 砲口（先端の少し太いリング）
cyl("muzzle", 0.008, 0.010, (0.156, 0, TZ + 0.002), dark, rot=(0, HALF, 0), verts=16)

# ── 車長ハッチ（小ドーム）・機銃・アンテナ ──
sphere("hatch", 0.013, (-0.020, 0.012, TZ + 0.015), olive, scale=(1, 1, 0.6), seg=16, ring=10)
# 機銃（砲塔上の小円柱・やや前傾）
cyl("mg", 0.003, 0.030, (-0.005, 0.020, TZ + 0.022), dark, rot=(0, 0.5, 0), verts=10)
# アンテナ 2本（細い縦の円柱）
for j, (ax, ay) in enumerate([(-0.030, 0.022), (-0.034, -0.018)]):
    cyl("antenna_%d" % j, 0.0016, 0.040, (ax, ay, TZ + 0.030), dark, verts=8)

# ── 角を軽く丸める（車体/砲塔の箱物）──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and (ob.name in ("hull", "glacis", "enginedeck", "turret")
                              or "turret_" in ob.name):
        bevel(ob, width=0.0025, segments=2)

join_all_except("tank")
export("tank.glb")
