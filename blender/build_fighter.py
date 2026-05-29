# -*- coding: utf-8 -*-
"""敵戦闘機（高精細）。機首=Blender -Y（→glTF +Z, lookAt 追従）、翼幅~0.5、up=+Z。
機体マテリアルは TINT_COLOR_body（国別色に着色される）。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

HALF = math.pi / 2

body   = mat("TINT_COLOR_body", color=(0.62, 0.64, 0.68), metallic=0.55, rough=0.40)
glass  = mat("fighter_glass", color=(0.20, 0.50, 0.70), metallic=0.0, rough=0.05,
             alpha=0.5, emission=(0.05, 0.20, 0.30), em_strength=0.5)
engine = mat("fighter_engine", color=(0.10, 0.10, 0.12), metallic=0.8, rough=0.40)
glow   = mat("fighter_glow", color=(1.0, 0.45, 0.05), emission=(1.0, 0.40, 0.05), em_strength=7.0)
detail = mat("fighter_detail", color=(0.14, 0.15, 0.18), metallic=0.5, rough=0.5)

# 胴体（Y軸方向に寝かせた円柱）
f = cyl("fuselage", 0.030, 0.26, (0, 0, 0), body, rot=(HALF, 0, 0), verts=20)
bevel(f, width=0.003, segments=1)
# 機首コーン（apex を -Y へ）
cone("nose", 0.030, 0.0, 0.16, (0, -0.20, 0), body, rot=(HALF, 0, 0), verts=20)
# 尾部（やや絞る）
cone("tailcone", 0.030, 0.016, 0.10, (0, 0.18, 0), body, rot=(HALF, 0, 0), verts=20)

# キャノピー（前方上面・Y方向に伸ばしたガラスドーム）
sphere("canopy", 0.024, (0, -0.06, 0.030), glass, scale=(1.0, 1.9, 0.85))

# 主翼（後退翼・左右）
lw = cube("wing_L", (0.24, 0.10, 0.012), (-0.13, 0.035, 0), body, rot=(0, 0, -0.45))
rw = cube("wing_R", (0.24, 0.10, 0.012), (0.13, 0.035, 0), body, rot=(0, 0, 0.45))
bevel(lw, width=0.004, segments=1)
bevel(rw, width=0.004, segments=1)

# 翼端ミサイル
cyl("missile_L", 0.006, 0.09, (-0.235, 0.0, -0.004), detail, rot=(HALF, 0, 0), verts=10)
cyl("missile_R", 0.006, 0.09, (0.235, 0.0, -0.004), detail, rot=(HALF, 0, 0), verts=10)

# 水平尾翼
cube("htail", (0.18, 0.05, 0.010), (0, 0.17, 0.004), body)
# 垂直尾翼
cube("vtail", (0.012, 0.10, 0.10), (0, 0.155, 0.060), body, rot=(0.25, 0, 0))

# 空気取入口（胴体下・左右）
cube("intake_L", (0.024, 0.10, 0.030), (-0.036, -0.02, -0.026), engine)
cube("intake_R", (0.024, 0.10, 0.030), (0.036, -0.02, -0.026), engine)

# エンジンノズル＋発光
cyl("nozzle", 0.028, 0.05, (0, 0.235, 0), engine, rot=(HALF, 0, 0), verts=18)
cyl("nozzle_glow", 0.021, 0.012, (0, 0.262, 0), glow, rot=(HALF, 0, 0), verts=18)

join_all_except("fighter")

export("fighter.glb")
