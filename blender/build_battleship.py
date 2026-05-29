# -*- coding: utf-8 -*-
"""【4号機担当】戦艦（大和型イメージ）。全長~0.60(X方向)、キール Z=0、up=+Z。
喫水下=赤/上=ライトグレーの2トーン、艦首は前方へ尖る、中央後方にパゴダ艦橋、
大煙突1本、三連装主砲3基(前2・後1, 背負い式)、マスト灯=TINT_GLOW_light。
SPEC.md の「① 戦艦」記述を参照。common.py の cube/cyl/cone/sphere/bevel で組む。
最後に join_all_except("battleship") → export("battleship.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

# TODO(4号機): SPEC.md ① の記述に沿って造形する。
# 例) hull_gray = mat("hull_gray", color=(0.32,0.34,0.36), metallic=0.3, rough=0.6)
#     hull_red  = mat("hull_red",  color=(0.5,0.06,0.06), metallic=0.1, rough=0.7)
#     light     = mat("TINT_GLOW_light", color=(1,0.6,0.2), emission=(1,0.6,0.2), em_strength=6)

# join_all_except("battleship")
# export("battleship.glb")
