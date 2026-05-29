# -*- coding: utf-8 -*-
"""【4号機担当】ガンダム風メカ（人型の敵）高精細版。全高~0.7、足裏=Z=0、直立、up=+Z。
正面（顔・胸・銃口）= Blender -Y（→glTF +Z, lookAt追従）。白基調＋青/赤/黄トリム、
ツインアイ発光・頬ダクト・V字アンテナ段差、コックピットハッチ/胸ダクト/コアブロック分割線、
大型ショルダーアーマー＋バーニア、肘シリンダー・手首ガード・指、膝/脛/足首装甲・大型フット、
バックパック＋スラスター(噴射口発光)＋サーベル柄、右手ビームライフル(銃口発光)＋左腕シールド。
※商標回避のため"オリジナルの人型モビルスーツ風"。着色TINT不要・固定マテリアル。
SPEC.md の「⑤ ガンダム風メカ」記述を参照。最後に join_all_except("gundam") → export("gundam.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()
HALF = math.pi / 2

# ── マテリアル（白基調＋青/赤/黄、固定）──
white  = mat("mecha_white",  color=(0.92, 0.94, 0.96), metallic=0.2, rough=0.40)
white2 = mat("mecha_white2", color=(0.82, 0.85, 0.89), metallic=0.2, rough=0.45)  # 影パネル
blue   = mat("mecha_blue",   color=(0.13, 0.22, 0.62), metallic=0.3, rough=0.40)
red    = mat("mecha_red",    color=(0.72, 0.11, 0.12), metallic=0.3, rough=0.40)
yellow = mat("mecha_yellow", color=(0.95, 0.78, 0.16), metallic=0.3, rough=0.40)
gray   = mat("mecha_gray",   color=(0.34, 0.36, 0.40), metallic=0.6, rough=0.40)  # 関節
dark   = mat("mecha_dark",   color=(0.11, 0.12, 0.15), metallic=0.7, rough=0.35)  # 内部/分割線/バーニア外筒
gun_m  = mat("mecha_gun",    color=(0.10, 0.11, 0.13), metallic=0.6, rough=0.45)
eye    = mat("mecha_eye",    color=(0.25, 1.0, 0.45), emission=(0.25, 1.0, 0.45), em_strength=5.0)
burn   = mat("mecha_burner", color=(1.0, 0.55, 0.2), emission=(1.0, 0.5, 0.18), em_strength=5.0)  # 噴射発光
saber  = mat("mecha_saber",  color=(0.6, 0.85, 1.0), emission=(0.5, 0.85, 1.0), em_strength=4.0)

# 正面 = -Y。右手(ライフル) = +X 側、左手(シールド) = -X 側。
for sx in (1, -1):
    # ── 脚 ──
    cube("foot_%d" % sx,  (0.090, 0.165, 0.050), (sx * 0.075, -0.020, 0.028), white)   # 大型フット
    cube("foot_toe_%d" % sx, (0.082, 0.05, 0.030), (sx * 0.075, -0.100, 0.020), gray)   # つま先装甲
    cube("ankle_%d" % sx, (0.055, 0.055, 0.045), (sx * 0.075, 0.0, 0.060), gray)        # 足首
    cube("shin_%d" % sx,  (0.082, 0.085, 0.185), (sx * 0.075, 0.0, 0.160), white)       # 脛
    cube("shin_vent_%d" % sx, (0.045, 0.018, 0.060), (sx * 0.075, -0.050, 0.150), dark) # 脛バーニア(前)
    cube("knee_%d" % sx,  (0.066, 0.045, 0.058), (sx * 0.075, -0.055, 0.260), blue)     # 膝アーマー
    cube("thigh_%d" % sx, (0.088, 0.092, 0.165), (sx * 0.075, 0.0, 0.345), white)       # 腿
    cube("thigh_seam_%d" % sx, (0.090, 0.094, 0.006), (sx * 0.075, 0.0, 0.300), dark)   # 分割線
    cube("hip_%d" % sx,   (0.058, 0.072, 0.058), (sx * 0.078, 0.0, 0.430), gray)
    # ── 腕 ──
    cube("shoulder_%d" % sx, (0.105, 0.135, 0.120), (sx * 0.180, 0.0, 0.585), blue)     # 大型肩アーマー
    cube("shoulder_cap_%d" % sx, (0.050, 0.090, 0.045), (sx * 0.210, 0.0, 0.610), white)# 肩上部白キャップ
    cube("sh_vernier_%d" % sx, (0.030, 0.030, 0.030), (sx * 0.205, 0.060, 0.585), dark) # 肩バーニア(後)
    cyl("elbowj_%d" % sx, 0.026, 0.055, (sx * 0.188, 0.0, 0.430), gray, rot=(0, HALF, 0), verts=12)  # 肘シリンダー
    cube("uparm_%d" % sx,  (0.058, 0.058, 0.120), (sx * 0.188, 0.0, 0.495), white)      # 上腕
    cube("forearm_%d" % sx,(0.074, 0.074, 0.130), (sx * 0.188, 0.0, 0.360), white)      # 前腕
    cube("forearm_arm_%d" % sx, (0.082, 0.040, 0.070), (sx * 0.188, -0.045, 0.370), white2)  # 前腕外装甲
    cube("wrist_%d" % sx,  (0.060, 0.060, 0.022), (sx * 0.188, 0.0, 0.300), gray)       # 手首ガード
    cube("hand_%d" % sx,   (0.046, 0.060, 0.050), (sx * 0.188, -0.012, 0.275), gray)    # 手
    cube("fingers_%d" % sx,(0.044, 0.030, 0.018), (sx * 0.188, -0.050, 0.270), dark)    # 指の示唆

# ── 腰（ウエストブロック）＋フロント/サイド/リアスカート ──
cube("waist", (0.205, 0.118, 0.085), (0, 0.0, 0.450), blue)
cube("waist_core", (0.060, 0.090, 0.062), (0, -0.045, 0.452), yellow)      # 腰前V(黄)
cube("waist_seam", (0.210, 0.122, 0.005), (0, 0.0, 0.418), dark)           # 分割線
for sx in (1, -1):
    cube("skirt_f_%d" % sx, (0.085, 0.045, 0.110), (sx * 0.052, -0.052, 0.410), white, rot=(0.18, 0, 0))  # 前スカート
    cube("skirt_s_%d" % sx, (0.035, 0.080, 0.095), (sx * 0.110, 0.0, 0.412), white2)   # サイドスカート
cube("skirt_back", (0.18, 0.05, 0.10), (0, 0.058, 0.415), white, rot=(-0.18, 0, 0))

# ── 胴・胸 ──
cube("torso", (0.225, 0.140, 0.130), (0, 0.0, 0.545), white)               # 胴
cube("torso_seam", (0.227, 0.142, 0.005), (0, 0.0, 0.505), dark)           # コアブロック分割線
cube("cockpit", (0.075, 0.020, 0.070), (0, -0.072, 0.535), yellow)         # コックピットハッチ(黄)
cube("collar", (0.150, 0.122, 0.045), (0, 0.0, 0.608), red)                # 襟(赤)
for sx in (1, -1):
    cube("vent_%d" % sx, (0.046, 0.022, 0.058), (sx * 0.055, -0.072, 0.572), yellow)   # 胸ダクト(黄)
    cube("collar_thr_%d" % sx, (0.028, 0.028, 0.025), (sx * 0.045, 0.060, 0.618), dark)# 襟元推進口(後)
cube("chest_center", (0.042, 0.030, 0.075), (0, -0.072, 0.560), red)       # 胸中央(赤)
cube("neck", (0.045, 0.045, 0.045), (0, 0.0, 0.616), gray)

# ── 頭部 ──
cube("head", (0.090, 0.096, 0.088), (0, 0.0, 0.654), white)
cube("face", (0.066, 0.020, 0.058), (0, -0.052, 0.650), gray)              # 顔下地(マスク)
# ツインアイ（左右の発光目）＋細い連結バイザー
for sx in (1, -1):
    cube("eye_%d" % sx, (0.016, 0.012, 0.014), (sx * 0.018, -0.060, 0.658), eye)
cube("visor", (0.050, 0.010, 0.008), (0, -0.060, 0.658), eye)
for sx in (1, -1):
    cube("cheek_%d" % sx, (0.012, 0.022, 0.030), (sx * 0.046, -0.030, 0.642), yellow)  # 頬ダクト(黄)
cube("forehead", (0.030, 0.024, 0.024), (0, -0.046, 0.692), red)           # 額カメラ(赤)
cube("head_sensor", (0.030, 0.030, 0.018), (0, 0.050, 0.690), dark)        # 後頭部センサー
# V字アンテナ（黄）: 中央クレスト＋段差＋左右プロング
cube("vfin_C", (0.022, 0.022, 0.022), (0, -0.030, 0.702), yellow)
cube("vfin_C2", (0.014, 0.018, 0.014), (0, -0.022, 0.718), red)            # 中央の段差(赤)
for sx in (1, -1):
    cube("vfin_%d" % sx, (0.012, 0.014, 0.078), (sx * 0.030, -0.030, 0.736), yellow, rot=(0, sx * 0.55, 0))

# ── バックパック＋スラスター2基(噴射口発光)＋サーベル柄 ──
cube("backpack", (0.150, 0.060, 0.180), (0, 0.092, 0.560), gray)
cube("backpack_seam", (0.152, 0.062, 0.005), (0, 0.092, 0.540), dark)
for sx in (1, -1):
    cyl("thruster_%d" % sx, 0.030, 0.075, (sx * 0.050, 0.128, 0.488), dark, rot=(0.5, 0, 0), verts=14)
    cyl("thr_glow_%d" % sx, 0.022, 0.018, (sx * 0.050, 0.150, 0.452), burn, rot=(0.5, 0, 0), verts=12)  # 噴射口発光
    cube("saber_%d" % sx, (0.018, 0.018, 0.075), (sx * 0.060, 0.118, 0.640), gray)     # サーベル柄(背)
    cube("saber_tip_%d" % sx, (0.012, 0.012, 0.012), (sx * 0.060, 0.118, 0.682), saber)

# ── ビームライフル（右手=+X 側、前方-Y へ）──
cube("rifle_body", (0.046, 0.190, 0.058), (0.188, -0.120, 0.300), gun_m)
cube("rifle_barrel", (0.022, 0.135, 0.024), (0.188, -0.262, 0.306), gun_m)
cube("rifle_scope", (0.020, 0.060, 0.024), (0.188, -0.090, 0.340), gun_m)
cube("rifle_mag", (0.030, 0.040, 0.078), (0.188, -0.070, 0.255), gun_m)
cube("rifle_muzzle", (0.030, 0.022, 0.032), (0.188, -0.335, 0.306), saber)   # 銃口(発光)

# ── シールド（左腕=-X 側・前腕外側に装備）──
cube("shield", (0.020, 0.110, 0.225), (-0.245, -0.030, 0.360), blue)
cube("shield_edge", (0.022, 0.110, 0.020), (-0.245, -0.030, 0.470), yellow)  # 上縁(黄)
cube("shield_cross", (0.024, 0.018, 0.150), (-0.246, -0.030, 0.360), white)  # 表の白ライン
cube("shield_arm", (0.030, 0.040, 0.040), (-0.225, 0.010, 0.360), gray)      # 連結アーム

# ── 角を軽く丸める（主要装甲ブロックのみ・segments=1 で軽量化）──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and any(k in ob.name for k in
            ("torso", "waist", "thigh", "shin", "shoulder_", "head", "foot_",
             "backpack", "shield")) and "seam" not in ob.name and "vent" not in ob.name:
        bevel(ob, width=0.003, segments=1)

join_all_except("gundam")
export("gundam.glb")
