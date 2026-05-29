# -*- coding: utf-8 -*-
"""【4号機担当】ガンダム風メカ（人型の敵）。全高~0.7、足裏=Z=0、直立、up=+Z。
正面（顔・胸・銃口）= Blender -Y（→glTF +Z, lookAt追従）。白基調＋青/赤＋黄ダクト、
頭部V字アンテナ＋発光する目、胴/腰/腕(肩-上腕-前腕)/脚(腿-脛-足)/頭、右手にビームライフル。
※商標回避のため"オリジナルの人型モビルスーツ風"。着色TINT不要・固定マテリアルでOK。
SPEC.md の「⑤ ガンダム風メカ」記述を参照。最後に join_all_except("gundam") → export("gundam.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()

# TODO(4号機): SPEC.md ⑤ の記述に沿って造形する。正面は -Y、足裏 Z=0。
# 例) white = mat("mecha_white", color=(0.93,0.95,0.96), metallic=0.2, rough=0.4)
#     eye   = mat("mecha_eye", color=(0.2,1.0,0.4), emission=(0.2,1.0,0.4), em_strength=5)

# join_all_except("gundam")
# export("gundam.glb")
