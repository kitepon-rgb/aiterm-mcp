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
import { createRequire } from "node:module";

// package.json の version を実行時に読み、MCP initialize で配るサーバ版と一致させる。
// createRequire を使うのは、import 属性 `with { type: "json" }` が Node 18.20+ 限定で
// engines "node >=18"（18.0〜18.19）を SyntaxError で壊し、旧 `assert` 構文は逆に Node 22 で
// 除去済み＝どちらの静的構文も 18〜22 全域を満たせないため（実行時 require が唯一全域で動く）。
const pkg = createRequire(import.meta.url)("../package.json") as { version: string };

const server = new McpServer({ name: "aiterm", version: pkg.version });

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
      mark: z
        .boolean()
        .default(false)
        .describe(
          "完了 sentinel(終了コード付き)で包む。pty_read(wait:true) が until 無しでも自動検出して" +
            "完了確定する（ネスト中や非シェル前面でも効く確実な完了検出。手で until を組む必要なし）",
        ),
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
      wait: z
        .boolean()
        .default(false)
        .describe("完了まで待つ（dead / mark sentinel 自動検出 / until / 出力静止∧シェル復帰 / timeout）"),
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

// 対話型エージェント起動ツール（モデルごとに1つ＝ツール名/説明でどのモデルか一目で分かる）。
// いずれも永続端末に TUI を起動し session_id を返す。以後 pty_read/pty_send で対話操作する。
const agentEffortDesc = (grokLike: boolean) =>
  "reasoning effort（思考レベル）。" +
  (grokLike ? "low/medium/high/xhigh/max" : "low/medium/high 等") +
  "。省略時は CLI 既定。";
function registerAgentTool(
  toolName: string,
  kind: "codex" | "grok" | "composer",
  desc: string,
  grokLike: boolean,
): void {
  server.registerTool(
    toolName,
    {
      description: desc,
      inputSchema: {
        prompt: z.string().nullish().describe("起動時に渡す初手プロンプト（任意）。省略で素のTUI起動"),
        // grok/composer の effort は有限集合＝schema で拒否（session を作る前に弾く）。
        // codex は CLI 側の値集合が版で変わるため縛らない（core 側も同方針）。
        reasoning_effort: (grokLike ? z.enum(["low", "medium", "high", "xhigh", "max"]) : z.string())
          .nullish()
          .describe(agentEffortDesc(grokLike)),
        cwd: z.string().nullish().describe("作業ディレクトリ（対象リポのルート等・任意）"),
        session_name: z.string().nullish().describe("セッション名（省略で自動採番）"),
      },
    },
    async ({ prompt, reasoning_effort, cwd, session_name }) => {
      try {
        const [sid, hint] = core.openAgent(kind, {
          prompt: prompt ?? undefined,
          reasoning_effort: reasoning_effort ?? undefined,
          cwd: cwd ?? undefined,
          session_name: session_name ?? undefined,
        });
        return ok(`session_id: ${sid}\n${hint}`);
      } catch (e) {
        return fail(e);
      }
    },
  );
}

registerAgentTool(
  "codex_agent",
  "codex",
  "【Codex (OpenAI・モデルは Codex CLI の既定)】の対話エージェント TUI を永続端末に起動する。実装・レビュー・調査を対話で回す。" +
    "起動後は pty_read で画面を読み pty_send で操作する。reasoning_effort を引数で指定可。",
  false,
);
registerAgentTool(
  "grok_agent",
  "grok",
  "【Grok Build の Grok モデル (grok-build)】の対話エージェント TUI を永続端末に起動する。" +
    "起動後は pty_read/pty_send で対話操作。reasoning_effort を引数で指定可。",
  true,
);
registerAgentTool(
  "composer_agent",
  "composer",
  "【Grok Build の Composer モデル (grok-composer-2.5-fast)】の対話エージェント TUI を永続端末に起動する。" +
    "起動後は pty_read/pty_send で対話操作。reasoning_effort を引数で指定可。",
  true,
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("aiterm-mcp fatal:", e);
  process.exit(1);
});
