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

# ── マテリアル（白基調＋青/赤/黄、固定）──
white = mat("mecha_white", color=(0.92, 0.94, 0.96), metallic=0.2, rough=0.40)
blue  = mat("mecha_blue",  color=(0.13, 0.22, 0.62), metallic=0.3, rough=0.40)
red   = mat("mecha_red",   color=(0.72, 0.11, 0.12), metallic=0.3, rough=0.40)
yellow = mat("mecha_yellow", color=(0.95, 0.78, 0.16), metallic=0.3, rough=0.40)
gray  = mat("mecha_gray",  color=(0.34, 0.36, 0.40), metallic=0.6, rough=0.40)  # 関節
gun_m = mat("mecha_gun",   color=(0.11, 0.12, 0.14), metallic=0.6, rough=0.45)
eye   = mat("mecha_eye",   color=(0.25, 1.0, 0.45), emission=(0.25, 1.0, 0.45), em_strength=5.0)

# 正面 = -Y。右手 = +X 側に置く。
for sx in (1, -1):  # 1=向かって左/メカの右(+X), -1=メカの左(-X) ※左右対称の脚・腕
    # ── 脚 ──
    cube("foot_%d" % sx, (0.075, 0.15, 0.05), (sx * 0.075, -0.020, 0.028), white)   # 足(前=-Yへ)
    cube("toe_%d" % sx,  (0.070, 0.05, 0.030), (sx * 0.075, -0.090, 0.018), gray)
    cube("shin_%d" % sx, (0.078, 0.082, 0.20), (sx * 0.075, 0.0, 0.155), white)     # 脛
    cube("knee_%d" % sx, (0.060, 0.040, 0.05), (sx * 0.075, -0.052, 0.258), blue)   # 膝当て
    cube("thigh_%d" % sx,(0.090, 0.092, 0.17), (sx * 0.075, 0.0, 0.345), white)     # 腿
    cube("hip_%d" % sx,  (0.060, 0.075, 0.06), (sx * 0.078, 0.0, 0.430), gray)
    # ── 腕 ──
    cube("shoulder_%d" % sx, (0.095, 0.130, 0.115), (sx * 0.178, 0.0, 0.585), blue)  # 肩アーマー
    cube("uparm_%d" % sx,    (0.058, 0.058, 0.125), (sx * 0.188, 0.0, 0.495), white) # 上腕
    cube("elbow_%d" % sx,    (0.050, 0.050, 0.040), (sx * 0.188, 0.0, 0.430), gray)
    cube("forearm_%d" % sx,  (0.072, 0.072, 0.130), (sx * 0.188, 0.0, 0.360), white) # 前腕
    cube("hand_%d" % sx,     (0.046, 0.062, 0.052), (sx * 0.188, -0.012, 0.292), gray)# 手

# ── 腰（ウエストブロック）＋フロントスカート ──
cube("waist", (0.205, 0.120, 0.085), (0, 0.0, 0.450), blue)
cube("waist_core", (0.060, 0.090, 0.060), (0, -0.040, 0.452), yellow)   # 腰前のV(黄)
for sx in (1, -1):
    cube("skirt_%d" % sx, (0.085, 0.045, 0.105), (sx * 0.055, -0.050, 0.415), white, rot=(0.18, 0, 0))
cube("skirt_back", (0.18, 0.05, 0.10), (0, 0.055, 0.420), white, rot=(-0.18, 0, 0))

# ── 胴・胸 ──
cube("torso", (0.225, 0.140, 0.120), (0, 0.0, 0.540), white)           # 胴
cube("collar", (0.150, 0.120, 0.045), (0, 0.0, 0.602), red)            # 襟(赤)
for sx in (1, -1):
    cube("vent_%d" % sx, (0.048, 0.022, 0.060), (sx * 0.052, -0.072, 0.560), yellow)  # 胸ダクト(黄)
cube("chest_center", (0.040, 0.030, 0.070), (0, -0.070, 0.560), red)   # 胸中央(赤)
cube("neck", (0.045, 0.045, 0.045), (0, 0.0, 0.612), gray)

# ── 頭部 ──
cube("head", (0.088, 0.094, 0.086), (0, 0.0, 0.652), white)
cube("face", (0.066, 0.020, 0.060), (0, -0.050, 0.648), gray)          # 顔下地(マスク)
cube("visor", (0.056, 0.014, 0.016), (0, -0.058, 0.658), eye)          # バイザー型の発光目
cube("forehead", (0.030, 0.024, 0.024), (0, -0.044, 0.690), red)       # 額のカメラ(赤)
# V字アンテナ（黄）: 額中央から左右へ上向きに開く2本
cube("vfin_C", (0.020, 0.020, 0.020), (0, -0.030, 0.700), yellow)
for sx in (1, -1):
    cube("vfin_%d" % sx, (0.012, 0.014, 0.075), (sx * 0.028, -0.030, 0.730),
         yellow, rot=(0, sx * 0.55, 0))

# ── バックパック＋スラスター ──
cube("backpack", (0.150, 0.060, 0.180), (0, 0.090, 0.560), gray)
for sx in (1, -1):
    cyl("thruster_%d" % sx, 0.028, 0.07, (sx * 0.05, 0.125, 0.490), gun_m,
        rot=(0.5, 0, 0), verts=14)

# ── ビームライフル（右手=+X 側、前方-Y へ）──
cube("rifle_body", (0.046, 0.190, 0.058), (0.188, -0.120, 0.320), gun_m)
cube("rifle_barrel", (0.022, 0.130, 0.024), (0.188, -0.260, 0.326), gun_m)
cube("rifle_scope", (0.020, 0.060, 0.022), (0.188, -0.090, 0.358), gun_m)
cube("rifle_mag", (0.030, 0.040, 0.075), (0.188, -0.070, 0.275), gun_m)
cube("rifle_muzzle", (0.030, 0.022, 0.032), (0.188, -0.330, 0.326), eye)  # 銃口(発光)

# ── 角を軽く丸める（主要装甲ブロックのみ・segments=1 で軽量化）──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and any(k in ob.name for k in
            ("torso", "waist", "thigh", "shin", "shoulder", "head", "foot", "backpack")):
        bevel(ob, width=0.003, segments=1)

join_all_except("gundam")
export("gundam.glb")
