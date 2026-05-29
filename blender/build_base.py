# -*- coding: utf-8 -*-
"""【4号機担当】空軍基地（滑走路）。滑走路全長~2.4(X方向)、司令塔高さ~1.0、接地 Z=0、up=+Z。
長い滑走路(濃アスファルト+白破線)・誘導路・駐機場・格納庫数棟・司令塔ビル+アンテナ、
司令塔頂部の警告灯=TINT_GLOW_light、敷地フチに緑(芝)の点。SPEC.md の「② 基地」記述を参照。
最後に join_all_except("base") → export("base.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

# TODO(4号機): SPEC.md ② の記述に沿って造形する（俯瞰の敷地＋立体物は司令塔/格納庫/アンテナ）。
# 例) asphalt = mat("asphalt", color=(0.13,0.13,0.14), rough=0.9)
#     light   = mat("TINT_GLOW_light", color=(1,0.3,0.2), emission=(1,0.3,0.2), em_strength=6)

# join_all_except("base")
# export("base.glb")
