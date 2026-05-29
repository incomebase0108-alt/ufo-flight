# -*- coding: utf-8 -*-
"""【4号機担当】UFO母艦（敵ボス・巨大）。直径~3.0(半径~1.5)・厚み~1.0、中心=原点、up=+Z。
巨大円盤＋司令ドーム＋下部トラクタービーム発光口＋外周の回転リング/多数の窓灯火＋砲塔張り出し。
SF映画のマザーシップ風の重厚感。窓は発光マテリアル面で表現（穴あけ不要）。~250KB目安。
SPEC.md の「④ UFO母艦」記述を参照。最後に join_all_except("mothership") → export("mothership.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

# TODO(4号機): SPEC.md ④ の記述に沿って造形する。
# 例) hull = mat("ship_hull", color=(0.27,0.34,0.41), metallic=0.7, rough=0.4)
#     win  = mat("ship_window", color=(0.4,0.8,1.0), emission=(0.3,0.7,1.0), em_strength=4)

# join_all_except("mothership")
# export("mothership.glb")
