#!/usr/bin/env python3
"""rag/build_index.py — manifest.json から人間可読の INDEX.md を再生成する。

使い方:
    python3 rag/build_index.py

ingest.py で取り込んだ後に実行し、rag/INDEX.md を最新化する。
"""
import json
import os

RAG = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(RAG, "manifest.json")
INDEX = os.path.join(RAG, "INDEX.md")

TOPIC_ORDER = ["prior-art", "completion-detection", "backends", "ansi-handling", "safety"]
TOPIC_LABEL = {
    "prior-art": "既存実装 / 流用調査 (prior-art)",
    "completion-detection": "完了境界の検出 (completion-detection)",
    "backends": "バックエンド (backends)",
    "ansi-handling": "ANSI / 画面整形 (ansi-handling)",
    "safety": "安全性 (safety)",
}


def main():
    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)
    docs = manifest.get("docs", [])
    updated = manifest.get("updated", "")
    by_topic = {}
    for d in docs:
        by_topic.setdefault(d["topic"], []).append(d)

    out = [
        "# RAG コーパス 総目次 (INDEX)",
        "",
        "AIターミナル直接操作プロジェクトの調査一次資料。`rag/sources/` 配下は MarkItDown で",
        "忠実 Markdown 化した版（front-matter にメタdata）。",
        "**設計/実装の前にまずここを読み、該当資料を再利用する（再フェッチしない）。**",
        "",
        f"- 総数: **{len(docs)}** 件 / 更新: {updated}",
        "- 取り込み: `python3 rag/ingest.py <sources.json>` → `python3 rag/build_index.py`",
        "- 統合分析: [briefs/](briefs/)",
        "",
    ]
    topics = [t for t in TOPIC_ORDER if t in by_topic] + \
             [t for t in by_topic if t not in TOPIC_ORDER]
    for t in topics:
        items = sorted(by_topic[t], key=lambda d: d["slug"])
        out.append(f"## {TOPIC_LABEL.get(t, t)} — {len(items)}件")
        out.append("")
        for d in items:
            title = d.get("title") or d["slug"]
            out.append(f"- [{title}]({d['path']}) — {d.get('summary', '')}")
            out.append(f"  - 出典: <{d['source_url']}> "
                       f"({d.get('source_type', 'web')}, {d.get('chars', '?')} chars)")
            if d.get("relevance"):
                out.append(f"  - 効きどころ: {d['relevance']}")
        out.append("")

    with open(INDEX, "w", encoding="utf-8") as f:
        f.write("\n".join(out).rstrip() + "\n")
    print(f"INDEX.md updated: {len(docs)} docs across {len(by_topic)} topics")


if __name__ == "__main__":
    main()
