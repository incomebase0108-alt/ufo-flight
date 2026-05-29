# -*- coding: utf-8 -*-
"""自機UFO（高精細）。up=+Z、半径~0.16の薄い円盤。回転リングは spinRing として分離。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

hull  = mat("ufo_hull",  color=(0.55, 0.72, 0.92), metallic=0.9, rough=0.20)
rim   = mat("ufo_rim",   color=(0.18, 0.26, 0.40), metallic=1.0, rough=0.30)
glass = mat("ufo_glass", color=(0.55, 0.88, 1.0), metallic=0.0, rough=0.05,
            alpha=0.45, emission=(0.10, 0.40, 0.60), em_strength=0.6)
glow  = mat("ufo_glow",  color=(0.0, 0.9, 1.0), emission=(0.0, 0.9, 1.0), em_strength=6.0)
lamps = mat("ufo_lamps", color=(0.7, 1.0, 1.0), emission=(0.6, 1.0, 1.0), em_strength=8.0)

# 上部ハル（扁平ドーム）
sphere("ufo_top", 0.16, (0, 0, 0.0), hull, scale=(1, 1, 0.30))
# 下部ハル（浅い円錐＝皿の底）
cone("ufo_bottom", 0.16, 0.0, 0.12, (0, 0, -0.05), hull, rot=(math.pi, 0, 0), verts=40)
# 赤道のリムバンド
torus("ufo_band", 0.155, 0.022, (0, 0, 0), rim, mseg=40, nseg=14)
# コックピット（ガラスドーム）
sphere("ufo_dome", 0.07, (0, 0, 0.045), glass, scale=(1, 1, 0.95))
# 下面の発光（トラクタービーム風）
sphere("ufo_underglow", 0.055, (0, 0, -0.075), glow, scale=(1, 1, 0.4))
# リムライト（8個）
for i in range(8):
    a = i * math.pi / 4
    sphere("ufo_lamp_%d" % i, 0.011, (math.cos(a) * 0.16, math.sin(a) * 0.16, 0.0), lamps, seg=12, ring=8)

# 回転リング（ゲーム側で spin させるため分離して残す）
ring = torus("spinRing", 0.185, 0.012, (0, 0, 0), glow, mseg=48, nseg=12)

# spinRing 以外を1メッシュに統合
join_all_except("ufoBody", keep_names=("spinRing",))

export("ufo.glb")
