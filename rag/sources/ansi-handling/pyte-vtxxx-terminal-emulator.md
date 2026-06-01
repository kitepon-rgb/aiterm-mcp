---
title: "pyte - Simple VTXXX-compatible in-memory terminal emulator (README)"
source_url: "https://raw.githubusercontent.com/selectel/pyte/master/README.rst"
source_type: github_readme
fetched: 2026-06-01
topic: ansi-handling
tags: ["pyte", "python", "vt100", "virtual-screen", "screen-scraping", "terminal-emulator"]
summary: "生バイト列を解釈してメモリ上の仮想端末スクリーンに描画するPythonライブラリの公式README。htop等のTUIをスクリーンスクレイプする用途を明記。"
relevance: "生バイト垂れ流しではなく仮想画面レンダリングで「最終的に見える画面」だけを取る側の代表実装。pty_readの出力をどう確定画面に畳むかの設計根拠。"
chars: 1375
---

::
\_
| |
\_ \_\_ \_ \_ | |\_ \_\_\_
| '\_ \ | | | || \_\_|/ \_ \
| |\_) || |\_| || |\_| \_\_/
| .\_\_/ \\_\_, | \\_\_|\\_\_\_|
| | \_\_/ |
|\_| |\_\_\_/ 0.8.3.dev
What is ``pyte``?
-----------------
It's an in memory VTXXX-compatible terminal emulator.
\*XXX\* stands for a series of video terminals, developed by
`DEC `\_ between
1970 and 1995. The first, and probably the most famous one, was VT100
terminal, which is now a de-facto standard for all virtual terminal
emulators. ``pyte`` follows the suit.
So, why would one need a terminal emulator library?
\* To screen scrape terminal apps, for example ``htop`` or ``aptitude``.
\* To write cross platform terminal emulators; either with a graphical
(`xterm `\_,
`rxvt `\_) or a web interface, like
`AjaxTerm `\_.
\* To have fun, hacking on the ancient, poorly documented technologies.
\*\*Note\*\*: ``pyte`` started as a fork of `vt102 `\_,
which is an incomplete pure Python implementation of VT100 terminal.
Installation
------------
If you have `pip `\_ you can do the usual::
pip install pyte
Otherwise, download the source from `GitHub `\_
and run::
python setup.py install
Similar projects
----------------
``pyte`` is not alone in the weird world of terminal emulator libraries,
here's a few other options worth checking out:
`Termemulator `\_,
`pyqonsole `\_,
`webtty `\_,
`AjaxTerm `\_ and of course
`vt102 `\_.
