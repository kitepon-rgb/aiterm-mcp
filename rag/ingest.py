#!/usr/bin/env python3
"""rag/ingest.py — 一次資料を Microsoft MarkItDown で忠実 Markdown 化し rag/sources/ に保全する取り込みツール。

研究で参照したソースは読み捨てない。本ツールが「常に同じ方式で RAG 化する」唯一の経路。

使い方:
    python3 rag/ingest.py <sources.json>

sources.json は次の配列:
    [{ "url", "slug", "topic", "title", "source_type", "tags"[], "summary", "relevance", "ext"? }]
    topic は rag/sources/<topic>/ のサブフォルダ名。ext を省くと URL から推測。

ネットワーク/外部HTTP は失敗しうる(EXPECTED-FAILURE: 外部システム境界)。失敗ソースはスキップして続行し、
末尾に要約を出す。rag/manifest.json は slug 単位でマージ更新する。
"""
import datetime
import json
import os
import subprocess
import sys
import tempfile

RAG = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(RAG, "sources")
MANIFEST = os.path.join(RAG, "manifest.json")


def guess_ext(url, rec):
    if rec.get("ext"):
        return rec["ext"]
    u = url.lower().split("?")[0]
    if u.endswith(".pdf") or "/pdf/" in u or "arxiv.org/pdf" in u:
        return "pdf"
    if u.endswith((".md", ".markdown")):
        return "md"
    if u.endswith(".txt"):
        return "txt"
    return "html"


def fetch(url, ext):
    fd, path = tempfile.mkstemp(suffix="." + ext)
    os.close(fd)
    r = subprocess.run(["curl", "-sL", "--max-time", "60",
                        "-A", "Mozilla/5.0 (rag-ingest)", "-o", path, url])
    size = os.path.getsize(path) if os.path.exists(path) else 0
    if r.returncode != 0 or size == 0:
        raise RuntimeError(f"fetch failed rc={r.returncode} size={size}")
    return path


def convert(path, ext):
    # 既に Markdown/プレーンテキストなら変換不要。
    # (MarkItDown の PlainTextConverter が charset 検出に失敗し ascii 復号で落ちる事故も回避)
    if ext in ("md", "markdown", "txt"):
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    r = subprocess.run(["markitdown", path], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("markitdown failed: " + r.stderr.strip()[:300])
    return r.stdout


def _yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


def _yaml_list(xs):
    return "[" + ", ".join(json.dumps(x, ensure_ascii=False) for x in xs) + "]"


def front_matter(rec, nchars, fetched):
    lines = [
        "---",
        "title: " + _yaml_str(rec.get("title", "")),
        "source_url: " + _yaml_str(rec["url"]),
        "source_type: " + (rec.get("source_type") or "web"),
        "fetched: " + fetched,
        "topic: " + rec["topic"],
        "tags: " + _yaml_list(rec.get("tags", [])),
        "summary: " + _yaml_str(rec.get("summary", "")),
        "relevance: " + _yaml_str(rec.get("relevance", "")),
        f"chars: {nchars}",
        "---",
    ]
    return "\n".join(lines) + "\n\n"


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST) as f:
            return json.load(f)
    return {"docs": []}


def main():
    if len(sys.argv) < 2:
        print("usage: ingest.py <sources.json>")
        sys.exit(2)
    with open(sys.argv[1]) as f:
        sources = json.load(f)
    fetched = datetime.date.today().isoformat()
    manifest = load_manifest()
    by_key = {d["topic"] + "/" + d["slug"]: d for d in manifest["docs"]}
    ok = 0
    failed = []
    for rec in sources:
        key = rec["topic"] + "/" + rec["slug"]
        try:
            ext = guess_ext(rec["url"], rec)
            tmp = fetch(rec["url"], ext)
            body = convert(tmp, ext).strip()
            os.remove(tmp)
            if len(body) < 50:
                raise RuntimeError(f"converted body too short ({len(body)} chars)")
            reldir = os.path.join(SRC, rec["topic"])
            os.makedirs(reldir, exist_ok=True)
            dest = os.path.join(reldir, rec["slug"] + ".md")
            with open(dest, "w") as f:
                f.write(front_matter(rec, len(body), fetched) + body + "\n")
            relpath = os.path.relpath(dest, RAG)
            by_key[key] = {
                "slug": rec["slug"], "topic": rec["topic"], "title": rec.get("title", ""),
                "source_url": rec["url"], "source_type": rec.get("source_type") or "web",
                "path": relpath, "tags": rec.get("tags", []),
                "summary": rec.get("summary", ""), "relevance": rec.get("relevance", ""),
                "chars": len(body), "fetched": fetched,
            }
            ok += 1
            print(f"OK   {key}  ({len(body)} chars) -> {relpath}")
        except Exception as e:
            failed.append((key, str(e)))
            print(f"FAIL {key}: {e}")
    manifest["docs"] = sorted(by_key.values(), key=lambda d: (d["topic"], d["slug"]))
    manifest["updated"] = fetched
    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\n== {ok} ok, {len(failed)} failed; manifest now has {len(manifest['docs'])} docs ==")
    for k, e in failed:
        print("  - " + k + ": " + e[:120])


if __name__ == "__main__":
    main()
