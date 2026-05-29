# UFO FLIGHT

Three.js 製の 3D 飛行シューティング（地球を飛んで各国の領空・基地・艦隊と戦う）。
簡易プリミティブ製だったモデルを Blender 5.1 製の高精細 GLB に差し替える改造中。

## 構成
- `index.html` … ゲーム本体（単一HTML。GLB は base64 で埋め込む）
- `blender/` … モデル生成スクリプト
  - `common.py` … 共通ヘルパー（マテリアル/プリミティブ/エクスポート、軸・スケール規約）
  - `SPEC.md` … 共通仕様＋参考画像のテキスト記述（**作業前に必読**）
  - `build_ufo.py` / `build_fighter.py` … 1号機担当（完成）
  - `build_battleship.py` / `build_base.py` / `build_tank.py` … 4号機担当
- `models/` … 書き出した `.glb`（base64 埋め込みの元）

## ビルド方法
```
cd blender
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python build_xxx.py
```
→ `models/xxx.glb` が出力される。commit & push すると 1号機が HTML へ埋め込む。

## 分担
| 担当 | モデル |
|---|---|
| 1号機 | UFO（自機）, 戦闘機（敵） |
| 4号機 | 戦艦, 基地, 戦車 |
