# -*- coding: utf-8 -*-
"""【4号機担当】戦車（陸自90式イメージ）。全長~0.18、幅~0.10、高さ~0.09、接地 Z=0、up=+Z。
濃緑(迷彩)・低い車体・左右履帯(転輪片側6個)・傾斜砲塔・長い主砲身が前方へ・車長ハッチ/機銃/アンテナ。
着色TINTは不要（全マテリアル固定）。SPEC.md の「③ 戦車」記述を参照。
最後に join_all_except("tank") → export("tank.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

# TODO(4号機): SPEC.md ③ の記述に沿って造形する。
# 例) green = mat("tank_green", color=(0.18,0.24,0.14), rough=0.8)
#     dark  = mat("tank_dark",  color=(0.06,0.07,0.06), rough=0.9)

# join_all_except("tank")
# export("tank.glb")
