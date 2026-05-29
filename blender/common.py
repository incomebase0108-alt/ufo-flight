# -*- coding: utf-8 -*-
"""
UFO FLIGHT 用 Blender 共通ヘルパー（Blender 5.1 想定）
- 1号機・4号機 共通で使用。これを import して各 build_*.py がモデルを組む。
- 目的: 軸・スケール・マテリアル命名を統一し、互換 GLB を量産する。

■ 座標・軸の約束（重要）
Blender は Z-up。glTF エクスポート（+Y Up）で次のように変換される:
    Blender(x, y, z)  ->  glTF(x, z, -y)
ゲーム(Three.js)側が期待する向き:
  - すべてのモデルの「上」 = glTF +Y = Blender +Z   … 上は必ず Blender +Z に向ける
  - 地上物(戦艦/基地/戦車)は接地面に置かれる。底面(キール/接地)を Blender Z=0 に揃える
    （placeOnSurface が +Y=外向き=上 に配置するため。水平の向きは任意でよい）
  - 戦闘機の機首 = glTF +Z = Blender -Y   … 機首は Blender -Y に向ける（lookAt 追従用）
  - UFO は回転対称なので水平の向きは不問、上を +Z に。

■ スケール（Three.js のワールド単位 = Blender 単位 1:1 で作る）
  ufo        : 直径 ~0.32（半径0.16）、薄い円盤
  fighter    : 全長 ~0.40（機首-Y〜尾+Y）、翼幅 ~0.50（X）
  battleship : 全長 ~0.60（X方向）、幅 ~0.12、キール上の高さ ~0.28、キール Z=0
  base       : 滑走路の全長 ~2.4（X方向）、司令塔の高さ ~1.0、接地 Z=0（大型）
  tank       : 全長 ~0.18、幅 ~0.10、高さ ~0.09、接地 Z=0（ゲーム側で更に0.7倍）

■ マテリアル命名規約（ゲーム側で国別色に着色する箇所）
  名前が "TINT_COLOR" を含む → コード側で material.color を国別色に置換
  名前が "TINT_GLOW"  を含む → コード側で material.emissive を国別色に置換（発光）
  それ以外 → GLB の見た目そのまま固定
"""

import bpy, math, os

# 出力先
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
OUT_DIR = os.path.normpath(OUT_DIR)


# ───────────────────────── シーン操作 ─────────────────────────
def wipe():
    """シーンの全オブジェクトと孤立データを消去（モデル間の名前衝突防止）。"""
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


# ───────────────────────── マテリアル ─────────────────────────
def mat(name, color=(0.8, 0.8, 0.8), metallic=0.0, rough=0.5,
        emission=(0, 0, 0), em_strength=0.0, alpha=1.0):
    """Principled BSDF マテリアルを生成。alpha<1 で半透明(ガラス)。"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if b is None:
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b is None:
        b = m.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in m.node_tree.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if out is None:
            out = m.node_tree.nodes.new("ShaderNodeOutputMaterial")
        m.node_tree.links.new(b.outputs[0], out.inputs[0])
    b.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if "Emission Color" in b.inputs:
        b.inputs["Emission Color"].default_value = (emission[0], emission[1], emission[2], 1.0)
        b.inputs["Emission Strength"].default_value = em_strength
    b.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        try:
            m.blend_method = 'BLEND'
        except Exception:
            pass
    return m


def _finish(name, material, smooth):
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.clear()
    ob.data.materials.append(material)
    if smooth:
        bpy.ops.object.shade_smooth()
    return ob


# ───────────────────────── プリミティブ ─────────────────────────
def cube(name, dim, loc, material, rot=(0, 0, 0)):
    """size=1 の立方体(辺-0.5..0.5)を dim 倍 = 寸法 dim の箱に。"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = _finish(name, material, smooth=False)
    ob.scale = dim
    ob.rotation_euler = rot
    return ob


def cyl(name, radius, depth, loc, material, rot=(0, 0, 0), verts=24):
    """円柱（既定で Z 軸方向）。"""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts, location=loc)
    ob = _finish(name, material, smooth=True)
    ob.rotation_euler = rot
    return ob


def cone(name, r1, r2, depth, loc, material, rot=(0, 0, 0), verts=24):
    """円錐/円錐台（apex は +Z 側）。r2=0 で尖る。"""
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, vertices=verts, location=loc)
    ob = _finish(name, material, smooth=True)
    ob.rotation_euler = rot
    return ob


def sphere(name, radius, loc, material, scale=(1, 1, 1), seg=32, ring=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=seg, ring_count=ring, location=loc)
    ob = _finish(name, material, smooth=True)
    ob.scale = scale
    return ob


def torus(name, major, minor, loc, material, rot=(0, 0, 0), mseg=32, nseg=12):
    """トーラス（既定で軸= Z）。"""
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=mseg, minor_segments=nseg, location=loc)
    ob = _finish(name, material, smooth=True)
    ob.rotation_euler = rot
    return ob


# ───────────────────────── 仕上げ・出力 ─────────────────────────
def bevel(ob, width=0.004, segments=2):
    """角を丸めて質感を上げる（エクスポート時に適用される）。"""
    md = ob.modifiers.new(name="Bevel", type='BEVEL')
    md.width = width
    md.segments = segments
    md.limit_method = 'ANGLE'


def join_all_except(active_name, keep_names=()):
    """keep_names を除く全メッシュを active_name に join。"""
    bpy.ops.object.select_all(action='DESELECT')
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    targets = [o for o in objs if o.name not in keep_names]
    if not targets:
        return
    active = bpy.data.objects.get(active_name) or targets[0]
    for o in targets:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active
    if len(targets) > 1:
        bpy.ops.object.join()
    bpy.context.active_object.name = active_name


def export(filename):
    """シーン全体を GLB 出力（モディファイア適用込み）。"""
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, filename)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,        # モディファイア(bevel等)を適用して出力
        export_yup=True,          # +Y Up（上記の軸変換前提）
    )
    size = os.path.getsize(path)
    print("[export] %s  (%.1f KB)" % (path, size / 1024.0))
    return path
