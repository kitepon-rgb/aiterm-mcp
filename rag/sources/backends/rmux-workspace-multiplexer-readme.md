---
title: "rmux — cross-platform workspace multiplexer with JSON-RPC socket API (README)"
source_url: "https://raw.githubusercontent.com/nakulbh/rmux/main/README.md"
source_type: github_readme
fetched: 2026-08-16
topic: backends
tags: ["windows", "multiplexer", "rust", "json-rpc", "agents"]
summary: "Rust製のcross-platform（Linux/macOS/Windows標榜）workspace multiplexer。pane分割・browser pane・通知・socket API（JSON-RPC、crates/rmux-api）。README上はtmux互換コマンド層やWindows実装詳細（ConPTY等）の記載なし。installerはmacOS/Linux向け。MIT。"
relevance: "X上では「tmux互換90コマンド+Typed SDK+persistent snapshots」と宣伝されるが、README一次資料では裏取りできなかった（宣伝と文書の乖離を記録）。Windows対応の実態は要実測。"
chars: 5226
---

<div align="center">

<img src="rmux_logo.jpg" alt="rmux logo" width="120">

# rmux

**Cross-platform terminal multiplexer GUI written in Rust.**

rmux is a memory-efficient terminal multiplexer with a native desktop interface. It supports workspaces, pane splits, browser panes, notifications, and a socket API for automation.

Targets Linux, macOS, and Windows.

[![CI](https://github.com/nakulbh/rmux/actions/workflows/ci.yml/badge.svg)](https://github.com/nakulbh/rmux/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

</div>

---

## Install

### One-liner (macOS & Linux)

```sh
curl -fsSL https://raw.githubusercontent.com/nakulbh/rmux/main/scripts/install.sh | bash
```

This will:

1. Install a Rust toolchain via rustup if needed  
2. Install platform build dependencies on Linux (apt/dnf/pacman, best-effort)  
3. Build `rmux` from source and install the binary to `~/.local/bin`  
4. Install the **official rmux logo** as the app icon:
   - **macOS** → `~/Applications/rmux.app` (Dock / Launchpad / Finder)
   - **Linux** → FreeDesktop icons + `rmux.desktop` under `~/.local/share`

Then run:

```sh
rmux
# macOS also:
open ~/Applications/rmux.app
```

#### Options

| Variable | Default | Meaning |
|---|---|---|
| `RMUX_VERSION` | `main` | Git branch or tag to install |
| `RMUX_INSTALL_DIR` | `~/.local/bin` | Where the `rmux` binary is placed |
| `RMUX_PREFIX` | `~/.local` | Prefix for Linux desktop files / icons |
| `RMUX_SKIP_DESKTOP` | `0` | Set to `1` to skip `.app` / `.desktop` + icon install |
| `RMUX_REPO` | `https://github.com/nakulbh/rmux.git` | Override the git remote |

Examples:

```sh
# Install a specific tag
RMUX_VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/nakulbh/rmux/main/scripts/install.sh | bash

# Binary only (no Dock / desktop entry)
RMUX_SKIP_DESKTOP=1 curl -fsSL https://raw.githubusercontent.com/nakulbh/rmux/main/scripts/install.sh | bash
```

### macOS

**Requirements:** Xcode Command Line Tools (`xcode-select --install`), git, curl.

```sh
curl -fsSL https://raw.githubusercontent.com/nakulbh/rmux/main/scripts/install.sh | bash
open ~/Applications/rmux.app
```

The installer creates `~/Applications/rmux.app` with `AppIcon.icns` generated from the official logo (`rmux_logo.jpg` / `assets/icons/`). The same logo is embedded in the binary for the window and Dock icon when launching `rmux` from the terminal.

### Linux

**Requirements:** git, curl, a C toolchain, and GUI/WebKit dev libraries (for `eframe` + `wry`).

Debian / Ubuntu:

```sh
sudo apt-get update
sudo apt-get install -y \
  build-essential pkg-config \
  libxcb-render0-dev libxcb-shape0-dev libxcb-xfixes0-dev \
  libxkbcommon-dev libssl-dev \
  libgtk-3-dev libglib2.0-dev libatk1.0-dev \
  libcairo2-dev libpango1.0-dev \
  libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev \
  libsoup-3.0-dev libgdk-pixbuf-2.0-dev
```

Fedora:

```sh
sudo dnf install -y gcc pkgconf-pkg-config openssl-devel gtk3-devel webkit2gtk4.1-devel
```

Arch:

```sh
sudo pacman -S --needed base-devel openssl gtk3 webkit2gtk-4.1
```

Then:

```sh
curl -fsSL https://raw.githubusercontent.com/nakulbh/rmux/main/scripts/install.sh | bash
rmux
```

Icons are installed to `~/.local/share/icons/hicolor/*/apps/rmux.png` and a launcher to `~/.local/share/applications/rmux.desktop`.

### From source (all platforms)

```sh
git clone https://github.com/nakulbh/rmux.git
cd rmux
cargo build --release -p rmux-app --bin rmux
./target/release/rmux
```

Optional install without the script:

```sh
cargo install --path crates/rmux-app --bin rmux
```

---

## Demo

<div align="center">
<img src="assets/videos/demo-shortcuts.gif" width="80%">
</div>

## Features

- Multi-workspace terminal sessions
- Horizontal and vertical pane splits with focus navigation
- Keyboard-first navigation
- Browser split support (wry-backed webview panes)
- Notification panel and desktop notifications (OSC 9/99/777)
- Unix socket API + CLI client for scripting

## Quick Start (development)

```sh
# Build
cargo build --workspace

# Run
cargo run -p rmux-app --bin rmux
```

## Verify

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

## Keyboard Shortcuts

macOS uses Cmd where Linux and Windows use Ctrl.

| Action | macOS | Linux/Windows |
|---|---|---|
| New Workspace | Cmd+N | Ctrl+N |
| Split Right | Cmd+D | Ctrl+D |
| Split Down | Cmd+Shift+D | Ctrl+Shift+D |
| Close Pane | Cmd+W | Ctrl+W |
| Toggle Sidebar | Cmd+B | Ctrl+B |
| Find | Cmd+F | Ctrl+F |

See [`docs/KEY_BINDINGS.md`](docs/KEY_BINDINGS.md) for the full reference.

## Project Layout

| Path | Purpose |
|---|---|
| `crates/rmux-app` | Main egui application |
| `crates/rmux-terminal` | Terminal emulation (alacritty_terminal + portable-pty) |
| `crates/rmux-cli` | CLI client |
| `crates/rmux-api` | Socket server (JSON-RPC) |
| `crates/rmux-config` | Configuration schema |
| `scripts/install.sh` | One-line installer for macOS and Linux |
| `rmux_logo.jpg` / `assets/icons/` | Official rmux logo (app icon) |

See [`docs/PLAN.md`](docs/PLAN.md) for the roadmap and [`AGENTS.md`](AGENTS.md) for contribution guidelines.

## License

MIT
