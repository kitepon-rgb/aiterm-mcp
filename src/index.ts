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
import { runtimeErrorStoreDiagnostic } from "./runtime-error-store.js";
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

/**
 * Factory 向けの read-only 診断。JSON の field は意図的に allowlist 制で、絶対 path、環境変数、
 * token、コマンド本文、PTY 出力、raw log、認証状態を公開しない。
 */
async function factoryDiagnostics(): Promise<string> {
  const ptyList = core.readOnlyPtyListDiagnostic();
  const claude = core.vendorLauncherDiagnostic("claude");
  const codex = core.vendorLauncherDiagnostic("codex");
  const grok = core.vendorLauncherDiagnostic("grok");
  const runtimeErrors = await runtimeErrorStoreDiagnostic();
  const overall = ptyList.status === "unverified" || runtimeErrors.status === "unverified" ? "unverified" : "ready";
  return JSON.stringify({
    diagnostic_schema: "aiterm-mcp.factory-diagnostics.v1",
    version: pkg.version,
    overall,
    mcp: { transport: "stdio", initialize: "ready", tool_call: "ready" },
    pty_list: { access: "read_only", ...ptyList },
    runtime_error_store: runtimeErrors,
    vendor_dependencies: {
      claude: {
        status: claude,
        optional: true,
        required_for: ["claude_agent"],
      },
      codex: {
        status: codex,
        optional: true,
        required_for: ["codex_agent"],
      },
      grok: {
        status: grok,
        optional: true,
        required_for: ["grok_agent", "composer_agent"],
      },
    },
  });
}

server.registerTool(
  "diagnostics",
  {
    description:
      "Factory 向け read-only 診断。安全な状態語彙だけを機械可読 JSON で返す（PTY 内容・認証情報・path・環境値は返さない）。",
    inputSchema: {},
  },
  async () => ok(await factoryDiagnostics()),
);

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
    description:
      "セッションへテキストを送る。通常PTYへは送信のみ（出力は pty_read で取得）。" +
      "agent session（launcher起動）への send は自動で dispatch になる: TUI の ready gate と submit 分離を通して即返り、" +
      "receipt の event_cursor を返す＝親はブロックしない。完了通知は `aiterm-wait --session <id> --cursor <event_cursor>` を" +
      "ホストのバックグラウンドタスクとして実行し、その exit で受ける（ポーリング不要）。" +
      "結果回収は pty_read(agent_transcript:true)、Claude の durable turn は claude_turn を使う。" +
      "force:true は agent session への手動介入用の素送信。",
    inputSchema: {
      session_id: z.string(),
      text: z
        .string()
        .describe("送る文字列（コマンド／prompt）。UTF-8で最大64KiB"),
      enter: z.boolean().default(true).describe("末尾で Enter を送る（agent dispatch では常に submit）"),
      mark: z
        .boolean()
        .default(false)
        .describe(
          "完了 sentinel(終了コード付き)で包む。pty_read(wait:true) が until 無しでも自動検出して" +
            "完了確定する（ネスト中や非シェル前面でも効く確実な完了検出。手で until を組む必要なし）。" +
            " enter:false と併用すると sentinel が実行されず完了検出が発火しない（送信後に pty_key(\"Enter\") で実行される）。",
        ),
      force: z
        .boolean()
        .default(false)
        .describe("破壊的コマンドゲートを越える。agent session では dispatch せず素送信する（手動介入用）"),
      rtk: z.boolean().default(false).describe("既知コマンドを rtk 形へ委譲して送る（rtk 不在なら素通し）"),
      raw: z.boolean().default(false).describe("送信前サニタイズを無効化"),
    },
    outputSchema: {
      schema: z.literal("aiterm.pty-send-result.v1"),
      mode: z.enum(["sent", "agent_dispatch"]),
      session_id: z.string(),
      event_cursor: z.number().int().nullable(),
      launch_id: z.string().nullable(),
      vendor: z.enum(["claude", "codex", "grok", "composer"]).nullable(),
    },
  },
  async ({ session_id, text, enter, mark, force, rtk, raw }) => {
    try {
      if (!force && core.isAgentSession(session_id)) {
        if (enter === false) throw new Error("agent session への dispatch は enter:false と併用できません（手動介入は force:true）");
        if (mark) throw new Error("agent session への dispatch は mark:true と併用できません");
        if (rtk) throw new Error("agent session への dispatch は rtk:true と併用できません");
        const receipt = await core.dispatchAgentTurn(session_id, text, { raw });
        return {
          content: [
            {
              type: "text" as const,
              text:
                `dispatchした（vendor=${receipt.vendor}）。完了通知: aiterm-wait --session ${receipt.session_id} --cursor ${receipt.event_cursor} を` +
                "ホストのバックグラウンドタスクとして実行し exit を待つ。回収: pty_read(agent_transcript:true)",
            },
          ],
          structuredContent: {
            schema: "aiterm.pty-send-result.v1" as const,
            mode: "agent_dispatch" as const,
            session_id: receipt.session_id,
            event_cursor: receipt.event_cursor,
            launch_id: receipt.launch_id,
            vendor: receipt.vendor,
          },
        };
      }
      const out = core.send(session_id, text, { enter, mark, force, rtk, raw });
      return {
        content: [{ type: "text" as const, text: out }],
        structuredContent: {
          schema: "aiterm.pty-send-result.v1" as const,
          mode: "sent" as const,
          session_id,
          event_cursor: null,
          launch_id: null,
          vendor: null,
        },
      };
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
      "削減: 制御文字除去 / 反復圧縮 / head+tail 折りたたみ＋復元ヒント＋メタ併記。" +
      "agent_transcript:true は agent session の直近完了ターンの最終 assistant メッセージを公開されたvendor記録から平文で返す。" +
      "長い回答が screen tail で切れた時の回収用。",
    inputSchema: {
      session_id: z.string(),
      wait: z
        .boolean()
        .default(false)
        .describe("完了まで待つ（dead / mark sentinel 自動検出 / until / 出力静止∧シェル復帰 / timeout）"),
      until: z
        .string()
        .nullish()
        .describe("この文字列が出たら完了とみなす（既定はリテラル部分一致。`$ ` や `[..]` もそのまま探せる）"),
      until_regex: z
        .boolean()
        .default(false)
        .describe("until を正規表現として扱う（既定 false＝リテラル部分一致。メタ文字を使いたい時のみ true）"),
      timeout: z.number().default(10).describe("wait の最大待ち秒数"),
      screen: z.boolean().default(false).describe("描画済みスクリーン(TUI 向け)"),
      full: z.boolean().default(false).describe("増分でなく全文"),
      lines: z.number().int().nullish().describe("末尾 N 行のみ"),
      line_range: z.string().nullish().describe('全文からの行範囲 "A:B"'),
      raw: z.boolean().default(false).describe("削減せず生テキスト"),
      rtk: z.boolean().default(false).describe("直前コマンド別の自前 reducer(git/grep/pytest 等)で縮約"),
      agent_transcript: z
        .boolean()
        .default(false)
        .describe("agent session の直近完了ターンの最終 assistant メッセージを返す。Claudeはmanaged Stop hook result、他vendorはtranscriptを使う。長い回答がscreen tailで切れた時の回収用"),
      operation_id: z
        .string()
        .regex(/^sha256:[0-9a-f]{64}$/)
        .nullish()
        .describe("Claude operationの期待ID。agent_transcript:true時だけ指定し、古い別operationの結果を拒否する"),
    },
  },
  async ({ session_id, wait, until, until_regex, timeout, screen, full, lines, line_range, raw, rtk, agent_transcript, operation_id }) => {
    try {
      if (agent_transcript) {
        if (screen || full || rtk || wait || line_range != null) {
          throw new Error("agent_transcript:true は screen / full / rtk / line_range / wait と併用できません。lines のみ指定できます。");
        }
        return ok(await core.readAgentTranscript(session_id, {
          lines: lines ?? null,
          operation_id: operation_id ?? null,
        }));
      }
      if (operation_id != null) throw new Error("operation_idはagent_transcript:true時だけ指定できます");
      let range: [number, number | null] | null = null;
      if (line_range) {
        const idx = line_range.indexOf(":");
        const lo = idx < 0 ? line_range : line_range.slice(0, idx);
        const hi = idx < 0 ? "" : line_range.slice(idx + 1);
        // 不正/空/負の上端は「末尾まで」(null) に倒す。"5:abc" を空に潰さず "5:" と同じく 5 行目以降に。
        // 下端は負値を 0 にクランプする（"-3:5" が負 slice にならないように・C12）。
        const loN = Math.max(0, parseInt(lo, 10) || 0);
        const hiN = hi ? parseInt(hi, 10) : NaN;
        const upper = Number.isNaN(hiN) || hiN < 0 ? null : hiN;
        if (upper !== null && upper < loN) {
          throw new Error(`line_range ${JSON.stringify(line_range)} が不正です: 上端が下端より小さい`);
        }
        range = [loN, upper];
      }
      const out = await core.readOutput(session_id, {
        wait,
        until: until ?? null,
        untilRegex: until_regex,
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
    description: "制御キーを送る（C-c, C-d, Enter, Tab, Up, Down... の別名に対応）。managed Claude sessionではturn相関を守るためC-cだけを許可する。",
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
    description:
      "セッションを閉じ、ログ／読取位置を破棄する。同じsession_idへの再試行は安全で、" +
      "closed／already_closedのstructured receiptを返す。",
    inputSchema: { session_id: z.string() },
    outputSchema: {
      schema: z.literal("aiterm.pty-close-result.v1"),
      session_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
      outcome: z.enum(["closed", "already_closed"]),
    },
  },
  async ({ session_id }) => {
    try {
      const result = core.closeSessionResult(session_id);
      return {
        content: [{ type: "text" as const, text: `closed ${session_id}` }],
        structuredContent: { ...result },
      };
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pty_list",
  {
    description: "握っているセッション一覧（名前 / 現在の前面コマンド / attach 状態 / サイズ / agent 情報）。",
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
  "claude_turn",
  {
    description:
      "managed Claude sessionのdurable operationを構造化issue／recoverするmachine-caller専用面。" +
      "pending／unknown／completedを人間向けerror文字列の解析なしで返し、Observer固有ロジックは持たない。",
    inputSchema: {
      action: z.enum(["issue", "recover"]),
      session_id: z.string(),
      operation_id: z.string().regex(/^sha256:[0-9a-f]{64}$/),
      text: z.string().optional().describe("issueだけに指定するbounded turn本文"),
    },
    outputSchema: {
      schema: z.literal("aiterm.claude-operation-result.v1"),
      action: z.enum(["issue", "recover"]),
      status: z.enum(["accepted", "pending", "completed", "unknown"]),
      session_id: z.string(),
      operation_id: z.string().regex(/^sha256:[0-9a-f]{64}$/),
      raw_output: z.string().nullable(),
      reason: z.enum(["operation_not_found", "result_unknown"]).nullable(),
    },
  },
  async ({ action, session_id, operation_id, text }) => {
    try {
      const result = await core.runClaudeOperation({
        action,
        session_id,
        operation_id,
        text: text ?? undefined,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        structuredContent: { ...result },
      };
    } catch (e) {
      return fail(e);
    }
  },
);

// 対話型エージェント起動ツール（モデルごとに1つ＝ツール名/説明でどのモデルか一目で分かる）。
// いずれも永続端末に TUI を起動し session_id を返す。以後 pty_read/pty_send で対話操作する。
const agentModelDesc = (kind: "claude" | "codex" | "grok" | "composer") =>
  kind === "claude"
    ? "起動モデル（例: claude-sonnet-4-6）。省略時はClaude CLI既定"
    : kind === "codex"
    ? "起動モデル（例: gpt-5.6-sol / gpt-5.6-terra / gpt-5.6-luna）。省略時は端末 config／CLI 既定を継承" +
      "（端末側のピンがそのまま効く。実効値は起動応答に明示される）"
    : `起動モデル。省略時は ${kind === "grok" ? "grok-4.5" : "grok-composer-2.5-fast"}`;
const agentEffortDesc = (kind: "claude" | "codex" | "grok" | "composer") =>
  kind === "claude"
    ? "Claude Code reasoning effort。low/medium/high/xhigh/max。省略時はCLI既定"
    : kind === "grok" || kind === "composer"
    ? "指定不可（grok CLI の --effort は headless 専用で、対話 TUI では警告の上無視される。" +
      "composer は effort 自体非対応）。指定すると起動前にエラーを返す"
    : "reasoning effort（思考レベル）。low/medium/high/xhigh/max/ultra（CLI 版依存）。" +
      "ultra は max 推論＋proactive 自動委譲 ON＝使用量急増注意（明示要求時のみ）。省略時は端末 config／CLI 既定。";
function registerAgentTool(
  toolName: string,
  kind: "claude" | "codex" | "grok" | "composer",
  desc: string,
): void {
  const correlatedLaunchSchema: Record<string, z.ZodTypeAny> = {};
  if (kind === "claude") {
    correlatedLaunchSchema.launch_operation_id = z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .optional()
      .describe("promptless managed launchのexact replay相関ID。session_name必須");
  }
  server.registerTool(
    toolName,
    {
      description: desc,
      inputSchema: {
        prompt: z.string().nullish().describe("起動時に渡す初手プロンプト（任意）。送信後は待たずに即返る"),
        model: z.string().nullish().describe(agentModelDesc(kind)),
        // grok/composer の effort は対話 TUI で無効（headless 専用）＝core 側が起動前に明示エラーで拒否。
        // codex は CLI 側の値集合が版で変わるため縛らない（core 側も同方針）。
        reasoning_effort: z.string().nullish().describe(agentEffortDesc(kind)),
        cwd: z.string().nullish().describe("作業ディレクトリ（対象リポのルート等・任意）"),
        session_name: z.string().nullish().describe("セッション名（省略で自動採番）"),
        ...correlatedLaunchSchema,
      },
      outputSchema: {
        schema: z.literal("aiterm.agent-launch-result.v1"),
        provider: z.literal(kind),
        session_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
        managed_completion: z.boolean(),
      },
    },
    async ({ prompt, model, reasoning_effort, cwd, session_name, launch_operation_id }: any) => {
      try {
        const [sid, hint] = await core.openAgentWithInitialPrompt(kind, {
          prompt: prompt ?? undefined,
          model: model ?? undefined,
          reasoning_effort: reasoning_effort ?? undefined,
          cwd: cwd ?? undefined,
          session_name: session_name ?? undefined,
          launch_operation_id: launch_operation_id ?? undefined,
        });
        const structured = {
          schema: "aiterm.agent-launch-result.v1" as const,
          provider: kind,
          session_id: sid,
          managed_completion: true,
        };
        return {
          content: [{ type: "text" as const, text: `session_id: ${sid}\n${hint}` }],
          structuredContent: structured,
        };
      } catch (e) {
        return fail(e);
      }
    },
  );
}

registerAgentTool(
  "claude_agent",
  "claude",
  "【Claude Code (Anthropic)】の対話エージェントTUIを永続端末に起動する。`claude -p`ではなく、" +
    "同じ利用者可視sessionへpty_sendで継続入力する。常にmanaged（isolated settingsのStop hook）で起動し、完了通知はaiterm-wait、結果はpty_read(agent_transcript)/claude_turnで回収する。",
);

registerAgentTool(
  "codex_agent",
  "codex",
  "【Codex (OpenAI)】の対話エージェント TUI を永続端末に起動する。実装・レビュー・調査を対話で回す。" +
    "起動後は pty_read で画面を読み pty_send で操作する。model / reasoning_effort を引数で指定可" +
    "（省略時は端末 config／CLI 既定を継承。実効値は起動応答に明示）。",
);
registerAgentTool(
  "grok_agent",
  "grok",
  "【Grok Build の Grok モデル (既定 grok-4.5)】の対話エージェント TUI を永続端末に起動する。" +
    "起動後は pty_read/pty_send で対話操作。model を引数で指定可。reasoning_effort は対話 TUI 非対応（指定はエラー）。",
);
registerAgentTool(
  "composer_agent",
  "composer",
  "【Grok Build の Composer モデル (既定 grok-composer-2.5-fast)】の対話エージェント TUI を永続端末に起動する。" +
    "起動後は pty_read/pty_send で対話操作。model を引数で指定可。reasoning_effort は非対応（指定はエラー）。",
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("aiterm-mcp fatal:", e);
  process.exit(1);
});
