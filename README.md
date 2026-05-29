# UFO FLIGHT

Three.js 製の 3D 飛行シューティング（地球を飛んで各国の領空・基地・艦隊と戦う）。
簡易プリミティブ製だったモデルを Blender 5.1 製の高精細 GLB に差し替える改造中。

🎮 **遊ぶ（公開URL）**: https://incomebase0108-alt.github.io/ufo-flight/
（GitHub Pages / master の `docs/index.html` を配信。`embed.py` 実行で `dist/` と `docs/` 両方更新）

## 構成
- `index.html` … ゲーム本体（単一HTML。GLB は base64 で埋め込む）
- `blender/` … モデル生成スクリプト
  - `common.py` … 共通ヘルパー（マテリアル/プリミティブ/エクスポート、軸・スケール規約）
  - `SPEC.md` … 共通仕様＋参考画像のテキスト記述（**作業前に必読**）
  - `build_ufo.py` / `build_fighter.py` … 1号機担当（完成）
  - `build_battleship.py` / `build_base.py` / `build_tank.py` / `build_mothership.py` / `build_gundam.py` … 4号機担当
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
| 1号機 | UFO（自機）, 戦闘機（敵）, ゲームロジック全般（パワーアップ/ビーム/回復/ボスAI/メカAI） |
| 4号機 | 戦艦, 基地, 戦車, UFO母艦(ボス), ガンダム風メカ |

## 追加要素（実装済み・1号機）
- パワーアップアイテム：⚡ビーム砲 / ﹅3連装ショット / ✚HP回復（空中に出現、接触で取得）
- 敵ボス「UFO母艦」：スコア到達で出現、HPバー表示、弾幕＋接触ダメージ（GLB未着時は簡易モデル）
- 「ガンダム風メカ」：低空でプレイヤーに正対して接近・射撃（GLB未着時は簡易モデル）
