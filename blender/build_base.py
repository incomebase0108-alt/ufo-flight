# -*- coding: utf-8 -*-
"""【4号機担当】空軍基地（滑走路）リアル版。滑走路全長~2.4(X方向)、司令塔高さ~1.0、接地 Z=0、up=+Z。
高精細化: 接地ゾーン/番号風マーク+黄誘導路ライン+滑走路端灯、ガラス管制室(emission)+レーダードーム+
回転レーダー+ビーコン、かまぼこ格納庫大小+扉+駐機影、駐機戦闘機シルエット、燃料タンク、外周フェンス、
対空砲座、土嚢バンカー、給油車/牽引車、ヘリパッド(H)。夜映え灯火は TINT_GLOW_light で国別着色対応。
SPEC.md の「② 基地」記述を参照。最後に join_all_except("base") → export("base.glb")。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

wipe()
HALF = math.pi / 2

# ── マテリアル ──
ground   = mat("ground",   color=(0.20, 0.26, 0.17), rough=0.95)            # 敷地(芝/土)
asphalt  = mat("asphalt",  color=(0.11, 0.11, 0.12), rough=0.9)             # 滑走路
taxi     = mat("taxi",     color=(0.16, 0.16, 0.18), rough=0.9)             # 誘導路
apron_m  = mat("apron",    color=(0.50, 0.51, 0.54), rough=0.85)            # 駐機場
white    = mat("white",    color=(0.90, 0.90, 0.88), rough=0.7)            # 白線
yellowm  = mat("yellowln", color=(0.85, 0.72, 0.12), rough=0.6)            # 誘導路黄線
building = mat("building", color=(0.60, 0.62, 0.66), metallic=0.2, rough=0.6)
glassem  = mat("glass_em", color=(0.45, 0.80, 1.0), metallic=0.0, rough=0.1,
               emission=(0.30, 0.65, 0.95), em_strength=3.0)               # 管制室ガラス(発光)
hangar_m = mat("hangar",   color=(0.48, 0.53, 0.58), metallic=0.45, rough=0.5)
door_m   = mat("door",     color=(0.28, 0.30, 0.34), metallic=0.4, rough=0.6)  # 格納庫扉
radar_w  = mat("radar",    color=(0.86, 0.87, 0.89), metallic=0.1, rough=0.4)  # レーダードーム白
metalg   = mat("metal",    color=(0.42, 0.45, 0.48), metallic=0.6, rough=0.4)  # タンク/砲
plane_m  = mat("parked",   color=(0.26, 0.28, 0.32), metallic=0.3, rough=0.5)  # 駐機機体
fence_m  = mat("fence",    color=(0.30, 0.32, 0.35), metallic=0.6, rough=0.4)
sandbag  = mat("sandbag",  color=(0.46, 0.42, 0.28), rough=0.95)               # 土嚢/バンカー
veh_o    = mat("vehicle",  color=(0.30, 0.34, 0.20), rough=0.7)                # 車両(オリーブ)
grass    = mat("grass",    color=(0.18, 0.45, 0.16), rough=0.9)
darkint  = mat("interior", color=(0.07, 0.08, 0.09), rough=1.0)               # 格納庫内・駐機影
# 国別着色される発光灯(滑走路端灯/管制塔ビーコン)— 名前に TINT_GLOW を含む
light    = mat("TINT_GLOW_light", color=(1.0, 0.85, 0.5), emission=(1.0, 0.8, 0.45), em_strength=6.0)

# ── 敷地（大きな薄い平板・Z=0 接地）──
cube("site", (2.7, 1.40, 0.012), (0, 0, 0.006), ground)

# ── 滑走路（濃アスファルト・全長~2.4）──
cube("runway", (2.4, 0.20, 0.014), (0, 0.0, 0.013), asphalt)
# センターライン破線
n = 11
for i in range(n):
    x = -1.10 + i * (2.20 / (n - 1))
    cube("rwline_%d" % i, (0.10, 0.014, 0.003), (x, 0, 0.0205), white)
# 両端の接地ゾーンマーク（センターライン両脇の平行バー群）＋しきいバー
for sx in (-1.0, 1.0):
    for j, dy in enumerate((-0.07, -0.045, 0.045, 0.07)):
        cube("tz_%d_%d" % (int(sx), j), (0.10, 0.014, 0.003), (sx, dy, 0.0205), white)
    # しきい(piano keys)
    for k, dy in enumerate((-0.075, -0.05, -0.025, 0.025, 0.05, 0.075)):
        cube("thr_%d_%d" % (int(sx), k), (0.05, 0.012, 0.003), (sx * 1.13, dy, 0.0205), white)
# 滑走路番号風マーク（端の2ブロック・数字までは作らず示唆）
for sx in (-1, 1):
    cube("rwnum_%d_a" % sx, (0.05, 0.018, 0.003), (sx * 0.92, sx * -0.0, 0.0205), white)
    cube("rwnum_%d_b" % sx, (0.05, 0.018, 0.003), (sx * 0.92, sx * 0.03, 0.0205), white)
# 滑走路端灯（両エッジ・TINT_GLOW_light で国別着色）
for i in range(8):
    x = -1.05 + i * (2.10 / 7)
    for ey in (-0.105, 0.105):
        sphere("rwlight_%d_%d" % (i, int(ey * 100)), 0.011, (x, ey, 0.018), light, seg=6, ring=4)

# ── 誘導路（滑走路に並走）＋黄センターライン ──
cube("taxiway", (2.0, 0.12, 0.013), (0, 0.34, 0.0125), taxi)
for i in range(12):
    x = -0.95 + i * (1.90 / 11)
    cube("txline_%d" % i, (0.10, 0.010, 0.003), (x, 0.34, 0.020), yellowm)

# ── 駐機場（エプロン）＋白縁 ──
cube("apron", (0.80, 0.50, 0.013), (-0.72, 0.55, 0.0125), apron_m)
cube("apron_edge", (0.80, 0.006, 0.004), (-0.72, 0.30, 0.0165), white)

# ── 格納庫（かまぼこ＝X軸に寝かせた円筒）大小数棟＋扉＋駐機影 ──
def hangar(name, x, y, length=0.20, r=0.06):
    cyl(name, r, length, (x, y, r), hangar_m, rot=(0, HALF, 0), verts=16)
    cube(name + "_w1", (0.012, r * 2, r * 2), (x + length / 2, y, r), hangar_m)
    cube(name + "_w2", (0.012, r * 2, r * 2), (x - length / 2, y, r), hangar_m)
    # 扉（前面=-Y側の壁に凹んだ暗い矩形）
    cube(name + "_door", (length * 0.7, 0.010, r * 1.4), (x, y - r * 0.98, r * 0.78), door_m)
    # 中の駐機影（床に暗い平板）
    cube(name + "_shadow", (length * 0.6, r * 1.2, 0.004), (x, y, 0.016), darkint)

hangar("hangarA", -0.55, 0.60, 0.22, 0.065)   # 大
hangar("hangarB", -0.78, 0.60, 0.22, 0.065)   # 大
hangar("hangarC", -1.00, 0.58, 0.16, 0.048)   # 小

# ── 駐機中の戦闘機シルエット（飛ばないオブジェ・機首+Y）──
def parked_fighter(name, x, y):
    cube(name + "_fuse", (0.020, 0.11, 0.022), (x, y, 0.030), plane_m)      # 胴(Y方向)
    cube(name + "_wing", (0.11, 0.030, 0.006), (x, y - 0.005, 0.028), plane_m)  # 主翼
    cube(name + "_tailp", (0.050, 0.020, 0.005), (x, y - 0.050, 0.028), plane_m)  # 水平尾翼
    cube(name + "_fin", (0.006, 0.022, 0.022), (x, y - 0.048, 0.044), plane_m)    # 垂直尾翼
    cone(name + "_nose", 0.011, 0.0, 0.03, (x, y + 0.065, 0.030), plane_m, rot=(-HALF, 0, 0), verts=10)

for i, px in enumerate((-0.50, -0.66, -0.82)):
    parked_fighter("pf%d" % i, px, 0.50)

# ── 燃料タンク（円筒＋ドーム頂）2〜3基 ──
def fuel_tank(name, x, y, r=0.05, h=0.11):
    cyl(name, r, h, (x, y, h / 2), metalg, verts=14)
    sphere(name + "_top", r, (x, y, h), metalg, scale=(1, 1, 0.4), seg=12, ring=6)

fuel_tank("tankA", 0.95, 0.42)
fuel_tank("tankB", 1.08, 0.42)
fuel_tank("tankC", 1.015, 0.55, 0.04, 0.09)

# ── 司令塔ビル（高さ~1.0）＋ガラス管制室＋レーダー＋ビーコン ──
tx, ty = -1.08, 0.20
cube("tower", (0.11, 0.11, 1.0), (tx, ty, 0.50), building)
cube("tower_cab", (0.18, 0.18, 0.10), (tx, ty, 0.955), building)        # 上部管制室
cube("tower_glass", (0.185, 0.185, 0.055), (tx, ty, 0.95), glassem)     # ガラス発光帯
cube("tower_roof", (0.20, 0.20, 0.015), (tx, ty, 1.015), building)
# アンテナ＋ビーコン灯（TINT_GLOW）
cyl("ant_mast", 0.005, 0.18, (tx, ty, 1.11), fence_m)
sphere("beacon", 0.014, (tx, ty, 1.205), light, seg=12, ring=8)
sphere("tower_light", 0.012, (tx, ty, 1.02), light, seg=10, ring=6)

# ── レーダー塔（ドーム＝白球 ＋ 回転レーダー＝傾いた平板）──
rx, ry = -0.95, -0.05
cube("radar_post", (0.05, 0.05, 0.22), (rx, ry, 0.11), building)
sphere("radar_dome", 0.075, (rx, ry, 0.26), radar_w, seg=14, ring=8)   # レドーム(ゴルフボール)
# 回転レーダー（隣の短い塔の上の傾いた皿）
cyl("radar2_post", 0.025, 0.18, (rx + 0.18, ry, 0.09), building, verts=12)
cube("radar2_dish", (0.14, 0.02, 0.07), (rx + 0.18, ry, 0.20), radar_w, rot=(0.5, 0, 0))
cube("radar2_arm", (0.012, 0.012, 0.05), (rx + 0.18, ry, 0.165), fence_m)

# ── ヘリパッド（円盤＋H マーク）──
hx, hy = 0.75, -0.40
cyl("helipad", 0.13, 0.004, (hx, hy, 0.016), apron_m, verts=20)
torus("heli_ring", 0.11, 0.006, (hx, hy, 0.019), white, mseg=20, nseg=5)
cube("heli_h1", (0.012, 0.08, 0.003), (hx - 0.03, hy, 0.021), white)
cube("heli_h2", (0.012, 0.08, 0.003), (hx + 0.03, hy, 0.021), white)
cube("heli_h3", (0.06, 0.012, 0.003), (hx, hy, 0.021), white)

# ── 対空砲座（土嚢リング＋連装砲・斜め上）──
def aa_emplacement(name, x, y):
    torus(name + "_ring", 0.05, 0.014, (x, y, 0.012), sandbag, mseg=16, nseg=6)
    cube(name + "_base", (0.035, 0.035, 0.022), (x, y, 0.022), metalg)
    for dx in (-0.008, 0.008):
        cyl(name + "_b_%d" % int(dx * 1000), 0.004, 0.07, (x + dx, y + 0.01, 0.05),
            metalg, rot=(-0.7, 0, 0), verts=8)

aa_emplacement("aaA", 1.15, -0.45)
aa_emplacement("aaB", -1.15, -0.45)
aa_emplacement("aaC", 1.20, 0.0)

# ── 土嚢バンカー（低い土色の塊）──
for i, (bx, by) in enumerate([(1.05, -0.20), (-1.05, -0.18), (0.0, -0.50)]):
    cube("bunker_%d" % i, (0.10, 0.06, 0.035), (bx, by, 0.0175), sandbag)
    sphere("bunker_top_%d" % i, 0.055, (bx, by, 0.035), sandbag, scale=(1, 0.6, 0.4), seg=12, ring=6)

# ── 車両（給油車・牽引車の小オブジェ）──
def vehicle(name, x, y):
    cube(name + "_body", (0.026, 0.065, 0.018), (x, y, 0.018), veh_o)
    cube(name + "_cab", (0.026, 0.022, 0.016), (x, y + 0.030, 0.030), veh_o)

vehicle("vehA", -0.40, 0.42)
vehicle("vehB", -0.30, 0.36)
vehicle("vehC", 0.10, 0.34)

# ── 外周フェンス（四辺の低いレール＋四隅の支柱で軽量に）──
FX, FY = 1.30, 0.66
cube("fence_s", (FX * 2, 0.004, 0.030), (0, -FY, 0.018), fence_m)
cube("fence_n", (FX * 2, 0.004, 0.030), (0, FY, 0.018), fence_m)
cube("fence_w", (0.004, FY * 2, 0.030), (-FX, 0, 0.018), fence_m)
cube("fence_e", (0.004, FY * 2, 0.030), (FX, 0, 0.018), fence_m)
for cx in (-FX, FX):
    for cy in (-FY, FY):
        cube("fpost_%d_%d" % (int(cx * 10), int(cy * 10)), (0.012, 0.012, 0.040), (cx, cy, 0.020), fence_m)

# ── 敷地フチの緑（芝/植栽の点）──
edge = [(-1.18, -0.58), (-0.6, -0.6), (0.0, -0.58), (0.6, -0.6), (1.18, -0.55),
        (1.22, 0.45), (0.6, 0.62), (-0.1, 0.63), (-1.22, 0.4), (1.25, -0.1)]
for i, (gx, gy) in enumerate(edge):
    sphere("grass_%d" % i, 0.045, (gx, gy, 0.012), grass, scale=(1, 1, 0.22), seg=8, ring=4)

# ── 角を軽く丸める（大きめの建物のみ・細部は軽量化のため除外）──
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and (ob.name in ("tower", "tower_cab", "tower_roof")
                              or ob.name.startswith("hangar") and "_" not in ob.name[6:]):
        bevel(ob, width=0.004, segments=1)

join_all_except("base")
export("base.glb")
