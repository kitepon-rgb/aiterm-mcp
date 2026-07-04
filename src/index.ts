#!/usr/bin/env node
/**
 * aiterm-mcp — AI が握るローカル永続端末を stdio MCP サーバとして公開する（Node/TS 版）。
 *
 * WSL2/Linux/mac のローカルで動かし、握るのはローカル端末1個。リモートは pty_send "ssh ..." で
 * 中に入る（ネスト）。バックエンドは tmux（実行時の前提）。ロジックは core.ts に集約。
 *
 * 重要: stdio MCP は stdout が JSON-RPC 専用。診断は stderr/console.error のみ（console.log 禁止）。
 * 起動: npx -y aiterm-mcp（または mcp 登録のコマンドに同じ）。
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as core from "./core.js";

const server = new McpServer({ name: "aiterm", version: "0.4.0" });

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function ok(s: string): ToolResult {
  return { content: [{ type: "text", text: s }] };
}
function fail(e: unknown): ToolResult {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text", text: "aiterm: " + msg }], isError: true };
}

server.registerTool(
  "pty_open",
  {
    description:
      "ローカル永続端末(tmux セッション)を1個開き、session_id を返す。tmux サーバ常駐ゆえ本サーバや " +
      "クライアントが再起動してもセッションは生存する。リモート操作は専用ツールにせず、開いた端末の中で " +
      'pty_send(session_id, "ssh host") と打って入る。',
    inputSchema: {
      name: z.string().nullish().describe("セッション名（省略時は t1, t2... を自動採番）"),
      shell: z.string().default("bash").describe("起動シェル（既定 bash）"),
    },
  },
  async ({ name, shell }) => {
    try {
      const [sid, hint] = core.openSession(name ?? null, shell);
      return ok(`session_id: ${sid}\n${hint}`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pty_send",
  {
    description: "セッションへテキスト(コマンド)を送る。送信後の出力は pty_read で取得する。",
    inputSchema: {
      session_id: z.string(),
      text: z.string().describe("送る文字列（コマンド）"),
      enter: z.boolean().default(true).describe("末尾で Enter を送る"),
      mark: z.boolean().default(false).describe("完了 sentinel(終了コード付き)で包む"),
      force: z.boolean().default(false).describe("破壊的コマンドゲートを越える"),
      rtk: z.boolean().default(false).describe("既知コマンドを rtk 形へ委譲して送る（rtk 不在なら素通し）"),
      raw: z.boolean().default(false).describe("送信前サニタイズを無効化"),
    },
  },
  async ({ session_id, text, enter, mark, force, rtk, raw }) => {
    try {
      return ok(core.send(session_id, text, { enter, mark, force, rtk, raw }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pty_read",
  {
    description:
      "セッションの出力をトークン削減して読む（既定は前回読取位置からの増分）。" +
      "削減: 制御文字除去 / 反復圧縮 / head+tail 折りたたみ＋復元ヒント＋メタ併記。",
    inputSchema: {
      session_id: z.string(),
      wait: z.boolean().default(false).describe("完了まで待つ（4層: dead/until/出力静止∧シェル復帰/timeout）"),
      until: z.string().nullish().describe("この正規表現が出たら完了とみなす"),
      timeout: z.number().default(10).describe("wait の最大待ち秒数"),
      screen: z.boolean().default(false).describe("描画済みスクリーン(TUI 向け)"),
      full: z.boolean().default(false).describe("増分でなく全文"),
      lines: z.number().int().nullish().describe("末尾 N 行のみ"),
      line_range: z.string().nullish().describe('全文からの行範囲 "A:B"'),
      raw: z.boolean().default(false).describe("削減せず生テキスト"),
      rtk: z.boolean().default(false).describe("直前コマンド別の自前 reducer(git/grep/pytest 等)で縮約"),
    },
  },
  async ({ session_id, wait, until, timeout, screen, full, lines, line_range, raw, rtk }) => {
    try {
      let range: [number, number | null] | null = null;
      if (line_range) {
        const idx = line_range.indexOf(":");
        const lo = idx < 0 ? line_range : line_range.slice(0, idx);
        const hi = idx < 0 ? "" : line_range.slice(idx + 1);
        // 不正/空の上端は「末尾まで」(null) に倒す。"5:abc" を空に潰さず "5:" と同じく 5 行目以降にする。
        const hiN = hi ? parseInt(hi, 10) : NaN;
        range = [parseInt(lo, 10) || 0, Number.isNaN(hiN) ? null : hiN];
      }
      const out = await core.readOutput(session_id, {
        wait,
        until: until ?? null,
        timeout,
        screen,
        full,
        lines: lines ?? null,
        range,
        raw,
        rtk,
      });
      return ok(out);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pty_key",
  {
    description: "制御キーを送る（C-c, C-d, Enter, Tab, Up, Down... の別名に対応）。",
    inputSchema: {
      session_id: z.string(),
      key: z.string().describe('キー名（例 "C-c", "Enter", "Up"）'),
    },
  },
  async ({ session_id, key }) => {
    try {
      return ok(core.sendKey(session_id, key));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pty_close",
  {
    description: "セッションを閉じ、ログ／読取位置を破棄する。",
    inputSchema: { session_id: z.string() },
  },
  async ({ session_id }) => {
    try {
      return ok(core.closeSession(session_id));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pty_list",
  {
    description: "握っているセッション一覧（名前 / 現在の前面コマンド / attach 状態 / サイズ）。",
    inputSchema: {},
  },
  async () => {
    try {
      return ok(core.listSessions());
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "delegate",
  {
    description:
      "実装の物量や独立レビューを、Claude レート非依存の外部AI(Codex)へ委譲する。統括(Claude)のレート窓を温存する道具。" +
      "mode=exec は codex に実装させる(workspace-write)、mode=review は read-only レビューさせて指摘を返す。" +
      "使いどころ: (1)仕様が固まった実装の物量が出たら mode=exec で委譲 (2)自分の設計/成果/計画を独立検証したい時は mode=review で叩かせ、指摘を敵対的に裁定してから採る。" +
      "委譲物は必ず統括が自分で検証してから採用する。codex 未導入環境では明示 no-op を返す。",
    inputSchema: {
      prompt: z.string().describe("委譲する仕様(file:line 付き推奨) または レビュー対象の指定"),
      mode: z
        .enum(["exec", "review"])
        .default("exec")
        .describe("exec=実装させる(workspace-write) / review=read-only レビューさせ指摘を返す"),
      cwd: z.string().nullish().describe("作業ディレクトリ(既定=現在のcwd)。対象リポのルートを渡す"),
      timeout_sec: z.number().default(600).describe("タイムアウト秒(既定600。委譲は数分かかる)"),
    },
  },
  async ({ prompt, mode, cwd, timeout_sec }) => {
    try {
      return ok(core.delegate({ prompt, mode, cwd: cwd ?? undefined, timeout_sec }));
    } catch (e) {
      return fail(e);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("aiterm-mcp fatal:", e);
  process.exit(1);
});
