---
title: "strip-ansi - 文字列からANSIエスケープコードを除去 (README)"
source_url: "https://raw.githubusercontent.com/chalk/strip-ansi/main/readme.md"
source_type: github_readme
fetched: 2026-06-01
topic: ansi-handling
tags: ["strip-ansi", "ansi", "node", "stripVTControlCharacters", "plain-text"]
summary: "ANSI制御コードを正規表現で剥がしプレーンテキスト化する定番npmパッケージ。Node組込stripVTControlCharactersの元実装でもある旨を記載。"
relevance: "仮想画面を組まずバイト列から色/装飾だけ落とす最軽量手法の代表。仮想画面レンダリングとのトレードオフ(安さ vs カーソル移動の取りこぼし)の片側。"
chars: 1222
---

# strip-ansi

> Strip [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) from a string

> [!NOTE]
> Node.js has this built-in now with [`stripVTControlCharacters`](https://nodejs.org/api/util.html#utilstripvtcontrolcharactersstr). The benefit of this package is consistent behavior across Node.js versions and faster improvements. The Node.js version is actually based on this package.

## Install

```sh
npm install strip-ansi
```

## Usage

```js
import stripAnsi from 'strip-ansi';

stripAnsi('\u001B[4mUnicorn\u001B[0m');
//=> 'Unicorn'

stripAnsi('\u001B]8;;https://github.com\u0007Click\u001B]8;;\u0007');
//=> 'Click'
```

## Related

- [strip-ansi-cli](https://github.com/chalk/strip-ansi-cli) - CLI for this module
- [strip-ansi-stream](https://github.com/chalk/strip-ansi-stream) - Streaming version of this module
- [has-ansi](https://github.com/chalk/has-ansi) - Check if a string has ANSI escape codes
- [ansi-regex](https://github.com/chalk/ansi-regex) - Regular expression for matching ANSI escape codes
- [chalk](https://github.com/chalk/chalk) - Terminal string styling done right

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Josh Junon](https://github.com/qix-)
