---
title: "Detach — GNU Screen User's Manual"
source_url: "https://www.gnu.org/software/screen/manual/html_node/Detach.html"
source_type: docs
fetched: 2026-06-01
topic: backends
tags: ["gnu-screen", "detach", "reattach", "autodetach", "-r", "persistence"]
summary: "GNU screenのdetach仕様。C-a dで端末から切離しバックグラウンド化、接続喪失時のautodetach、-rでの再接続を解説。"
relevance: "tmuxの代替バックエンド候補。接続が切れてもセッションとプロセスが生存する挙動(autodetach)を公式に確認でき、バックエンド比較の根拠になる。"
chars: 1578
---

Next: [Power Detach](Power-Detach.html), Up: [Session Management Commands](Session-Management.html)   [[Contents](index.html#SEC_Contents "Table of contents")][[Index](Concept-Index.html "Index")]

---

### 8.1 Detach

Command: **autodetach** *state* [¶](#index-autodetach)
:   (none)
    Sets whether `screen` will automatically detach upon hangup, which
    saves all your running programs until they are resumed with a
    `screen -r` command. When turned off, a hangup signal will
    terminate `screen` and all the processes it contains. Autodetach is
    on by default.

Command: **detach** [¶](#index-detach)
:   (`C-a d`, `C-a C-d`)
    Detach the `screen` session (disconnect it from the terminal and
    put it into the background). A detached `screen` can be resumed by
    invoking `screen` with the `-r` option (see [Invoking `Screen`](Invoking-Screen.html)).
    The `-h` option tells screen to immediately close the connection
    to the terminal (‘`hangup`’).

Command: **password** *[crypted\_pw]* [¶](#index-password)
:   (none)
    Present a crypted password in your `.screenrc` file and screen will
    ask for it, whenever someone attempts to resume a detached session. This
    is useful, if you have privileged programs running under `screen`
    and you want to protect your session from reattach attempts by users
    that managed to assume your uid. (I.e. any superuser.) If no crypted
    password is specified, screen prompts twice a password and places its
    encryption in the paste buffer. Default is ‘none’, which disables
    password checking.
