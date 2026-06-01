---
title: "ptyprocess README"
source_url: "https://raw.githubusercontent.com/pexpect/ptyprocess/master/README.rst"
source_type: github_readme
fetched: 2026-06-01
topic: backends
tags: ["ptyprocess", "python", "pty", "spawn", "read", "write", "curses"]
summary: "Pythonで擬似端末内に子プロセスを起動するライブラリ。PtyProcess.spawnでread/write、パスワードプロンプトやcurses系UIの自動化に必要なPTYを提供。"
relevance: "Python実装でPTYを直接握る低レベル選択肢(pexpectの基盤)。tmux非依存の send/read を最小コストで実現する土台。"
chars: 578
---

Launch a subprocess in a pseudo terminal (pty), and interact with both the
process and its pty.
Sometimes, piping stdin and stdout is not enough. There might be a password
prompt that doesn't read from stdin, output that changes when it's going to a
pipe rather than a terminal, or curses-style interfaces that rely on a terminal.
If you need to automate these things, running the process in a pseudo terminal
(pty) is the answer.
Interface:
.. code:: python
from ptyprocess import PtyProcessUnicode
p = PtyProcessUnicode.spawn(['python'])
p.read(20)
p.write('6+6\n')
p.read(20)
