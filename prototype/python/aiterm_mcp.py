#!/usr/bin/env python3
"""aiterm_mcp — aiterm をローカル stdio MCP サーバとして公開する薄いラッパ。

WSL2(ローカル)で動かし、握るのはローカル端末1個。リモートは pty_send "ssh ..." で中に入る（ネスト）。
ロジックは aiterm_core に集約。本ファイルは FastMCP のツールとして 6 操作を公開するだけ。

重要: stdio MCP は **stdout が JSON-RPC 専用**。aiterm_core は stdout に print しない設計なので、
本サーバの stdout は通信フレームだけで汚れない。診断が要る場合も print() は使わず stderr/log へ。

登録: プロジェクトroot の .mcp.json に stdio サーバ "aiterm" として登録（command=python3, args=本ファイル）。
起動: python3 src/aiterm_mcp.py （通常は Claude Code が .mcp.json 経由で起動する）。
"""
from typing import Optional

from mcp.server.fastmcp import FastMCP

import aiterm_core as core

mcp = FastMCP("aiterm")


@mcp.tool()
def pty_open(name: Optional[str] = None, shell: str = "bash") -> str:
    """ローカル永続端末(tmux セッション)を1個開き、session_id を返す。

    tmux サーバ常駐ゆえ、このサーバや Claude Code が再起動してもセッションは生存する。
    リモート操作は専用ツールにせず、開いた端末の中で pty_send(session_id, "ssh host") と打って入る。

    Args:
        name: セッション名（省略時は t1, t2... を自動採番）。
        shell: 起動シェル（既定 bash）。
    """
    sid, hint = core.open_session(name, shell)
    return f"session_id: {sid}\n{hint}"


@mcp.tool()
def pty_send(session_id: str, text: str, enter: bool = True, mark: bool = False,
             force: bool = False, rtk: bool = False, raw: bool = False) -> str:
    """セッションへテキスト(コマンド)を送る。送信後の出力は pty_read で取得する。

    Args:
        session_id: 対象セッション。
        text: 送る文字列（コマンド）。
        enter: 末尾で Enter を送る（既定 True）。
        mark: 完了 sentinel（終了コード付き）で包む。
        force: 破壊的コマンドゲートを越える（既定は遮断）。
        rtk: 既知コマンドを rtk 形へ委譲して送り、実行先で出力削減を効かせる（rtk 不在なら素通し）。
        raw: 送信前サニタイズを無効化（既定はサニタイズ有効）。
    """
    return core.send(session_id, text, enter=enter, mark=mark,
                     force=force, rtk=rtk, raw=raw)


@mcp.tool()
def pty_read(session_id: str, wait: bool = False, until: Optional[str] = None,
             timeout: float = core.DEFAULT_TIMEOUT, screen: bool = False,
             full: bool = False, lines: Optional[int] = None,
             line_range: Optional[str] = None, raw: bool = False,
             rtk: bool = False) -> str:
    """セッションの出力をトークン削減して読む（既定は前回読取位置からの増分）。

    削減: 制御文字除去 / 反復圧縮 / head+tail 折りたたみ＋復元ヒント＋メタ併記。

    Args:
        session_id: 対象セッション。
        wait: 完了まで待つ（4層検出: dead / until / 出力静止∧シェル復帰 / timeout）。
        until: この正規表現が出たら完了とみなす。
        timeout: wait の最大待ち秒数。
        screen: 描画済みスクリーンを取得（vim/top 等の TUI 向け）。
        full: 増分でなく全文を返す。
        lines: 末尾 N 行のみ。
        line_range: 全文からの行範囲 "A:B"。
        raw: 削減せず生テキストで返す。
        rtk: 直前に送ったコマンド別の自前 reducer（git/grep/pytest 等）で観測出力を縮約する。
    """
    rng = None
    if line_range:
        lo, _, hi = line_range.partition(":")
        rng = (int(lo or 0), int(hi) if hi else None)
    return core.read_output(session_id, wait=wait, until=until, timeout=timeout,
                            screen=screen, full=full, lines=lines,
                            range_=rng, raw=raw, rtk=rtk)


@mcp.tool()
def pty_key(session_id: str, key: str) -> str:
    """制御キーを送る（C-c, C-d, Enter, Tab, Up, Down... の別名に対応）。

    Args:
        session_id: 対象セッション。
        key: キー名（例 "C-c", "Enter", "Up"）。
    """
    return core.send_key(session_id, key)


@mcp.tool()
def pty_close(session_id: str) -> str:
    """セッションを閉じ、ログ／読取位置を破棄する。

    Args:
        session_id: 対象セッション。
    """
    return core.close_session(session_id)


@mcp.tool()
def pty_list() -> str:
    """握っているセッション一覧（名前 / 現在の前面コマンド / attach 状態 / サイズ）。"""
    return core.list_sessions()


if __name__ == "__main__":
    mcp.run(transport="stdio")
