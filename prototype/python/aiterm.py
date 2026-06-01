#!/usr/bin/env python3
"""aiterm — AI が握るローカル永続端末 CLI（tmux バックエンド・出力削減つき）。

ロジックは aiterm_core に集約（CLI と MCP サーバ src/aiterm_mcp.py が共有）。
本 CLI は引数を解釈して core を呼び、結果を stdout/stderr へ出すだけの薄い層。

1個のローカル専用 tmux セッションを握り、send でキーストロークを流し、read で画面/出力を
トークン削減して受け取る。SSH/docker は専用機能にせず `send <id> "ssh host"` で中に入る（ネスト）。
セッションは tmux サーバ常駐ゆえ、本プロセスが毎回終了しても次回 read で再接続できる。

使い方:
    python3 src/aiterm.py open [--name N] [--shell bash]
    python3 src/aiterm.py send <id> "echo hi"        [--no-enter] [--mark] [--force] [--rtk]
    python3 src/aiterm.py key  <id> C-c
    python3 src/aiterm.py read <id> [--wait] [--until RE] [--timeout S]
                                    [--screen] [--full] [--lines N] [--range A:B] [--raw]
    python3 src/aiterm.py list | close <id> | kill-all | attach-cmd <id>
"""
import argparse
import sys

import aiterm_core as core


def cmd_open(a):
    name, hint = core.open_session(a.name, a.shell)
    print(name)
    print(hint, file=sys.stderr)


def cmd_send(a):
    print(core.send(a.id, a.text, enter=not a.no_enter, mark=a.mark,
                    force=a.force, rtk=a.rtk, raw=a.raw_send))


def cmd_key(a):
    print(core.send_key(a.id, a.key))


def cmd_read(a):
    out = core.read_output(a.id, wait=a.wait, until=a.until, timeout=a.timeout,
                           screen=a.screen, full=a.full, lines=a.lines,
                           range_=a.range, raw=a.raw_send, rtk=a.rtk)
    if a.raw_send:
        sys.stdout.write(out)
    else:
        print(out)


def cmd_list(a):
    print(core.list_sessions())


def cmd_close(a):
    print(core.close_session(a.id))


def cmd_kill_all(a):
    print(core.kill_all())


def cmd_attach_cmd(a):
    print(core.attach_hint(a.id))


def _range(s):
    lo, _, hi = s.partition(":")
    return (int(lo or 0), int(hi) if hi else None)


def build_parser():
    p = argparse.ArgumentParser(prog="aiterm",
                                description="AI が握るローカル永続端末 CLI（tmux・出力削減つき）")
    sub = p.add_subparsers(dest="cmd", required=True)

    o = sub.add_parser("open", help="専用 tmux セッションを新規に握る")
    o.add_argument("--name")
    o.add_argument("--shell", default="bash")
    o.set_defaults(func=cmd_open)

    s = sub.add_parser("send", help="テキスト（コマンド）を送る")
    s.add_argument("id")
    s.add_argument("text")
    s.add_argument("--no-enter", action="store_true")
    s.add_argument("--mark", action="store_true", help="完了 sentinel(rc 付き)で包む")
    s.add_argument("--force", action="store_true", help="破壊的コマンドゲートを越える")
    s.add_argument("--rtk", action="store_true", help="既知コマンドを rtk 形へ委譲して送る")
    s.add_argument("--raw", dest="raw_send", action="store_true", help="サニタイズせず送る")
    s.set_defaults(func=cmd_send)

    k = sub.add_parser("key", help="制御キーを送る (C-c, Enter, Up...)")
    k.add_argument("id")
    k.add_argument("key")
    k.set_defaults(func=cmd_key)

    r = sub.add_parser("read", help="出力を削減して取得")
    r.add_argument("id")
    r.add_argument("--wait", action="store_true", help="完了まで待つ(4層検出)")
    r.add_argument("--until", help="この正規表現が出たら完了")
    r.add_argument("--timeout", type=float, default=core.DEFAULT_TIMEOUT)
    r.add_argument("--screen", action="store_true", help="描画済みスクリーン(TUI向け)")
    r.add_argument("--full", action="store_true", help="増分でなく全文")
    r.add_argument("--lines", type=int, help="末尾 N 行のみ")
    r.add_argument("--range", type=_range, metavar="A:B", help="行範囲(全文から)")
    r.add_argument("--raw", dest="raw_send", action="store_true", help="削減せず生で")
    r.add_argument("--rtk", action="store_true", help="直前コマンド別の自前 reducer で削減")
    r.set_defaults(func=cmd_read)

    for nm, fn, h in [("list", cmd_list, "セッション一覧"),
                      ("kill-all", cmd_kill_all, "socket 上の全セッション削除")]:
        sp = sub.add_parser(nm, help=h)
        sp.set_defaults(func=fn)
    for nm, fn, h in [("close", cmd_close, "セッションを閉じる"),
                      ("attach-cmd", cmd_attach_cmd, "人が覗くコマンドを表示")]:
        sp = sub.add_parser(nm, help=h)
        sp.add_argument("id")
        sp.set_defaults(func=fn)
    return p


def main():
    args = build_parser().parse_args()
    try:
        args.func(args)
    except core.AitermError as e:
        print("aiterm: " + str(e), file=sys.stderr)
        sys.exit(e.code)


if __name__ == "__main__":
    main()
