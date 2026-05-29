# -*- coding: utf-8 -*-
"""models/*.glb を base64 化して index.html のプレースホルダへ埋め込み、
完全単一ファイル dist/index.html を生成する。GLBが増えたら再実行するだけ。"""
import base64, os, json, glob, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "index.html")
MODELS = os.path.join(ROOT, "models")
DIST = os.path.join(ROOT, "dist")
os.makedirs(DIST, exist_ok=True)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

data = {}
for path in sorted(glob.glob(os.path.join(MODELS, "*.glb"))):
    key = os.path.splitext(os.path.basename(path))[0]
    with open(path, "rb") as g:
        data[key] = base64.b64encode(g.read()).decode("ascii")

payload = "window.GLB_DATA=" + json.dumps(data, separators=(",", ":")) + ";"
marker = "/*__GLB_DATA__*/window.GLB_DATA = window.GLB_DATA || {};"
if marker not in html:
    print("ERROR: GLB_DATA プレースホルダが index.html に見つかりません")
    sys.exit(1)
html = html.replace(marker, payload)

# オーディオエンジン（4号機）をインライン埋め込み（単一ファイル化）
audio_path = os.path.join(ROOT, "audio", "audio-engine.js")
audio_marker = "/*__AUDIO_ENGINE__*/"
if audio_marker in html and os.path.isfile(audio_path):
    with open(audio_path, "r", encoding="utf-8") as af:
        audio_js = af.read()
    html = html.replace(audio_marker, audio_js)
    print("オーディオエンジン埋め込み: OK")
else:
    print("オーディオエンジン: プレースホルダ未検出 or ファイル無し（スキップ）")

out = os.path.join(DIST, "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

# GitHub Pages 公開用（master /docs から配信）にも同じ内容を出力
DOCS = os.path.join(ROOT, "docs")
os.makedirs(DOCS, exist_ok=True)
docs_out = os.path.join(DOCS, "index.html")
with open(docs_out, "w", encoding="utf-8") as f:
    f.write(html)

print("埋め込んだモデル:", list(data.keys()))
print("出力:", out, "(%.1f KB)" % (os.path.getsize(out) / 1024.0))
print("公開用:", docs_out)
