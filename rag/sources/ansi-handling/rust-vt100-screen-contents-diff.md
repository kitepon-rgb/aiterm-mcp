---
title: "vt100 (Rust) Screen 構造体 - contents_diff / contents_formatted"
source_url: "https://docs.rs/vt100/latest/vt100/struct.Screen.html"
source_type: docs
fetched: 2026-06-01
topic: ansi-handling
tags: ["rust", "vt100", "contents-diff", "screen-diff", "token-saving", "tmux"]
summary: "端末バイト列をメモリ画面に解析するRustクレートのScreen API。前回画面と現在画面の差分バイト列を返すcontents_diff()を定義。"
relevance: "全画面TUI(vim/top)の差分取得=トークン節約の中核根拠。前回状態を保持して差分だけLLMに渡す設計の一次資料。"
chars: 33530
---

[Docs.rs](/)

* vt100-0.16.2

  + vt100 0.16.2
  + [Permalink](/vt100/0.16.2/vt100/struct.Screen.html "Get a link to this specific version")
  + [Docs.rs crate page](/crate/vt100/latest "See vt100 in docs.rs")
  + [MIT](https://spdx.org/licenses/MIT)

  + Links
  + [Homepage](https://github.com/doy/vt100-rust)
  + [Repository](https://github.com/doy/vt100-rust)
  + [crates.io](https://crates.io/crates/vt100 "See vt100 in crates.io")
  + [Source](/crate/vt100/latest/source/ "Browse source of vt100-0.16.2")

  + Owners
  + [doy](https://crates.io/users/doy)

  + Dependencies
  + - [itoa ^1.0.15
      *normal*](/itoa/%5E1.0.15/)
    - [unicode-width ^0.2.1
      *normal*](/unicode-width/%5E0.2.1/)
    - [vte ^0.15.0
      *normal*](/vte/%5E0.15.0/)
    - [nix ^0.30.1
      *dev*](/nix/%5E0.30.1/)
    - [quickcheck ^1.0
      *dev*](/quickcheck/%5E1.0/)
    - [rand ^0.9
      *dev*](/rand/%5E0.9/)
    - [serde ^1.0.219
      *dev*](/serde/%5E1.0.219/)
    - [serde\_json ^1.0.140
      *dev*](/serde_json/%5E1.0.140/)
    - [terminal\_size ^0.4.2
      *dev*](/terminal_size/%5E0.4.2/)

  + Versions

  + [**100%**
    of the crate is documented](/crate/vt100/latest)
* Platform
  + [aarch64-apple-darwin](/crate/vt100/latest/target-redirect/aarch64-apple-darwin/vt100/struct.Screen.html)
  + [aarch64-unknown-linux-gnu](/crate/vt100/latest/target-redirect/aarch64-unknown-linux-gnu/vt100/struct.Screen.html)
  + [i686-pc-windows-msvc](/crate/vt100/latest/target-redirect/i686-pc-windows-msvc/vt100/struct.Screen.html)
  + [x86\_64-pc-windows-msvc](/crate/vt100/latest/target-redirect/x86_64-pc-windows-msvc/vt100/struct.Screen.html)
  + [x86\_64-unknown-linux-gnu](/crate/vt100/latest/target-redirect/vt100/struct.Screen.html)
* [Feature flags](/crate/vt100/latest/features "Browse available feature flags of vt100-0.16.2")

* docs.rs
  + [About docs.rs](/about)
  + [Badges](/about/badges)
  + [Builds](/about/builds)
  + [Metadata](/about/metadata)
  + [Shorthand URLs](/about/redirections)
  + [Download](/about/download)
  + [Rustdoc JSON](/about/rustdoc-json)
  + [Build queue](/releases/queue)
  + [Privacy policy](https://foundation.rust-lang.org/policies/privacy-policy/#docs.rs)

* Rust
  + [Rust website](https://www.rust-lang.org/)
  + [The Book](https://doc.rust-lang.org/book/)
  + [Standard Library API Reference](https://doc.rust-lang.org/std/)
  + [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
  + [The Cargo Guide](https://doc.rust-lang.org/cargo/guide/)
  + [Clippy Documentation](https://doc.rust-lang.org/nightly/clippy)

## Screen

## [vt100](../vt100/index.html)0.16.2

## Screen

### [Methods](#implementations)

* [alternate\_screen](#method.alternate_screen "alternate_screen")
* [application\_cursor](#method.application_cursor "application_cursor")
* [application\_keypad](#method.application_keypad "application_keypad")
* [attributes\_formatted](#method.attributes_formatted "attributes_formatted")
* [bgcolor](#method.bgcolor "bgcolor")
* [bold](#method.bold "bold")
* [bracketed\_paste](#method.bracketed_paste "bracketed_paste")
* [cell](#method.cell "cell")
* [contents](#method.contents "contents")
* [contents\_between](#method.contents_between "contents_between")
* [contents\_diff](#method.contents_diff "contents_diff")
* [contents\_formatted](#method.contents_formatted "contents_formatted")
* [cursor\_position](#method.cursor_position "cursor_position")
* [cursor\_state\_formatted](#method.cursor_state_formatted "cursor_state_formatted")
* [dim](#method.dim "dim")
* [fgcolor](#method.fgcolor "fgcolor")
* [hide\_cursor](#method.hide_cursor "hide_cursor")
* [input\_mode\_diff](#method.input_mode_diff "input_mode_diff")
* [input\_mode\_formatted](#method.input_mode_formatted "input_mode_formatted")
* [inverse](#method.inverse "inverse")
* [italic](#method.italic "italic")
* [mouse\_protocol\_encoding](#method.mouse_protocol_encoding "mouse_protocol_encoding")
* [mouse\_protocol\_mode](#method.mouse_protocol_mode "mouse_protocol_mode")
* [row\_wrapped](#method.row_wrapped "row_wrapped")
* [rows](#method.rows "rows")
* [rows\_diff](#method.rows_diff "rows_diff")
* [rows\_formatted](#method.rows_formatted "rows_formatted")
* [scrollback](#method.scrollback "scrollback")
* [set\_scrollback](#method.set_scrollback "set_scrollback")
* [set\_size](#method.set_size "set_size")
* [size](#method.size "size")
* [state\_diff](#method.state_diff "state_diff")
* [state\_formatted](#method.state_formatted "state_formatted")
* [underline](#method.underline "underline")

### [Trait Implementations](#trait-implementations)

* [Clone](#impl-Clone-for-Screen "Clone")
* [Debug](#impl-Debug-for-Screen "Debug")

### [Auto Trait Implementations](#synthetic-implementations)

* [Freeze](#impl-Freeze-for-Screen "Freeze")
* [RefUnwindSafe](#impl-RefUnwindSafe-for-Screen "RefUnwindSafe")
* [Send](#impl-Send-for-Screen "Send")
* [Sync](#impl-Sync-for-Screen "Sync")
* [Unpin](#impl-Unpin-for-Screen "Unpin")
* [UnwindSafe](#impl-UnwindSafe-for-Screen "UnwindSafe")

### [Blanket Implementations](#blanket-implementations)

* [Any](#impl-Any-for-T "Any")
* [Borrow<T>](#impl-Borrow%3CT%3E-for-T "Borrow<T>")
* [BorrowMut<T>](#impl-BorrowMut%3CT%3E-for-T "BorrowMut<T>")
* [CloneToUninit](#impl-CloneToUninit-for-T "CloneToUninit")
* [From<T>](#impl-From%3CT%3E-for-T "From<T>")
* [Into<U>](#impl-Into%3CU%3E-for-T "Into<U>")
* [ToOwned](#impl-ToOwned-for-T "ToOwned")
* [TryFrom<U>](#impl-TryFrom%3CU%3E-for-T "TryFrom<U>")
* [TryInto<U>](#impl-TryInto%3CU%3E-for-T "TryInto<U>")

## [In crate vt100](index.html)

[vt100](index.html)

# Struct Screen Copy item path

[Source](../src/vt100/screen.rs.html#55-65)

```
pub struct Screen { /* private fields */ }
```

Expand description

Represents the overall terminal state.

## Implementations[§](#implementations)

[Source](../src/vt100/screen.rs.html#67-702)[§](#impl-Screen)

### impl [Screen](struct.Screen.html "struct vt100::Screen")

[Source](../src/vt100/screen.rs.html#88-92)

#### pub fn [set\_size](#method.set_size)(&mut self, rows: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), cols: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html))

Resizes the terminal.

[Source](../src/vt100/screen.rs.html#98-101)

#### pub fn [size](#method.size)(&self) -> ([u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html))

Returns the current size of the terminal.

The return value will be (rows, cols).

[Source](../src/vt100/screen.rs.html#113-115)

#### pub fn [set\_scrollback](#method.set_scrollback)(&mut self, rows: [usize](https://doc.rust-lang.org/nightly/std/primitive.usize.html))

Scrolls to the given position in the scrollback.

This position indicates the offset from the top of the screen, and
should be `0` to put the normal screen in view.

This affects the return values of methods called on the screen: for
instance, `screen.cell(0, 0)` will return the top left corner of the
screen after taking the scrollback offset into account.

The value given will be clamped to the actual size of the scrollback.

[Source](../src/vt100/screen.rs.html#122-124)

#### pub fn [scrollback](#method.scrollback)(&self) -> [usize](https://doc.rust-lang.org/nightly/std/primitive.usize.html)

Returns the current position in the scrollback.

This position indicates the offset from the top of the screen, and is
`0` when the normal screen is in view.

[Source](../src/vt100/screen.rs.html#131-135)

#### pub fn [contents](#method.contents)(&self) -> [String](https://doc.rust-lang.org/nightly/alloc/string/struct.String.html "struct alloc::string::String")

Returns the text contents of the terminal.

This will not include any formatting information, and will be in plain
text format.

[Source](../src/vt100/screen.rs.html#148-158)

#### pub fn [rows](#method.rows)(&self, start: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), width: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html)) -> impl [Iterator](https://doc.rust-lang.org/nightly/core/iter/traits/iterator/trait.Iterator.html "trait core::iter::traits::iterator::Iterator")<Item = [String](https://doc.rust-lang.org/nightly/alloc/string/struct.String.html "struct alloc::string::String")> + '\_

Returns the text contents of the terminal by row, restricted to the
given subset of columns.

This will not include any formatting information, and will be in plain
text format.

Newlines will not be included.

[Source](../src/vt100/screen.rs.html#167-217)

#### pub fn [contents\_between](#method.contents_between)( &self, start\_row: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), start\_col: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), end\_row: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), end\_col: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), ) -> [String](https://doc.rust-lang.org/nightly/alloc/string/struct.String.html "struct alloc::string::String")

Returns the text contents of the terminal logically between two cells.
This will include the remainder of the starting row after `start_col`,
followed by the entire contents of the rows between `start_row` and
`end_row`, followed by the beginning of the `end_row` up until
`end_col`. This is useful for things like determining the contents of
a clipboard selection.

[Source](../src/vt100/screen.rs.html#224-229)

#### pub fn [state\_formatted](#method.state_formatted)(&self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Return escape codes sufficient to reproduce the entire contents of the
current terminal state. This is a convenience wrapper around
[`contents_formatted`](struct.Screen.html#method.contents_formatted "method vt100::Screen::contents_formatted") and
[`input_mode_formatted`](struct.Screen.html#method.input_mode_formatted "method vt100::Screen::input_mode_formatted").

[Source](../src/vt100/screen.rs.html#236-241)

#### pub fn [state\_diff](#method.state_diff)(&self, prev: &Self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Return escape codes sufficient to turn the terminal state of the
screen `prev` into the current terminal state. This is a convenience
wrapper around [`contents_diff`](struct.Screen.html#method.contents_diff "method vt100::Screen::contents_diff") and
[`input_mode_diff`](struct.Screen.html#method.input_mode_diff "method vt100::Screen::input_mode_diff").

[Source](../src/vt100/screen.rs.html#249-253)

#### pub fn [contents\_formatted](#method.contents_formatted)(&self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Returns the formatted visible contents of the terminal.

Formatting information will be included inline as terminal escape
codes. The result will be suitable for feeding directly to a raw
terminal parser, and will result in the same visual output.

[Source](../src/vt100/screen.rs.html#273-298)

#### pub fn [rows\_formatted](#method.rows_formatted)( &self, start: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), width: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), ) -> impl [Iterator](https://doc.rust-lang.org/nightly/core/iter/traits/iterator/trait.Iterator.html "trait core::iter::traits::iterator::Iterator")<Item = [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)>> + '\_

Returns the formatted visible contents of the terminal by row,
restricted to the given subset of columns.

Formatting information will be included inline as terminal escape
codes. The result will be suitable for feeding directly to a raw
terminal parser, and will result in the same visual output.

You are responsible for positioning the cursor before printing each
row, and the final cursor position after displaying each row is
unspecified.

[Source](../src/vt100/screen.rs.html#311-315)

#### pub fn [contents\_diff](#method.contents_diff)(&self, prev: &Self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Returns a terminal byte stream sufficient to turn the visible contents
of the screen described by `prev` into the visible contents of the
screen described by `self`.

The result of rendering `prev.contents_formatted()` followed by
`self.contents_diff(prev)` should be equivalent to the result of
rendering `self.contents_formatted()`. This is primarily useful when
you already have a terminal parser whose state is described by `prev`,
since the diff will likely require less memory and cause less
flickering than redrawing the entire screen contents.

[Source](../src/vt100/screen.rs.html#340-368)

#### pub fn [rows\_diff](#method.rows_diff)<'a>( &'a self, prev: &'a Self, start: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), width: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), ) -> impl [Iterator](https://doc.rust-lang.org/nightly/core/iter/traits/iterator/trait.Iterator.html "trait core::iter::traits::iterator::Iterator")<Item = [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)>> + 'a

Returns a sequence of terminal byte streams sufficient to turn the
visible contents of the subset of each row from `prev` (as described
by `start` and `width`) into the visible contents of the corresponding
row subset in `self`.

You are responsible for positioning the cursor before printing each
row, and the final cursor position after displaying each row is
unspecified.

[Source](../src/vt100/screen.rs.html#379-383)

#### pub fn [input\_mode\_formatted](#method.input_mode_formatted)(&self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Returns terminal escape sequences sufficient to set the current
terminal’s input modes.

Supported modes are:

* application keypad
* application cursor
* bracketed paste
* xterm mouse support

[Source](../src/vt100/screen.rs.html#412-416)

#### pub fn [input\_mode\_diff](#method.input_mode_diff)(&self, prev: &Self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Returns terminal escape sequences sufficient to change the previous
terminal’s input modes to the input modes enabled in the current
terminal.

[Source](../src/vt100/screen.rs.html#471-475)

#### pub fn [attributes\_formatted](#method.attributes_formatted)(&self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Returns terminal escape sequences sufficient to set the current
terminal’s drawing attributes.

Supported drawing attributes are:

* fgcolor
* bgcolor
* bold
* dim
* italic
* underline
* inverse

This is not typically necessary, since
[`contents_formatted`](struct.Screen.html#method.contents_formatted "method vt100::Screen::contents_formatted") will leave
the current active drawing attributes in the correct state, but this
can be useful in the case of drawing additional things on top of a
terminal output, since you will need to restore the terminal state
without the terminal contents necessarily being the same.

[Source](../src/vt100/screen.rs.html#489-492)

#### pub fn [cursor\_position](#method.cursor_position)(&self) -> ([u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html))

Returns the current cursor position of the terminal.

The return value will be (row, col).

[Source](../src/vt100/screen.rs.html#512-516)

#### pub fn [cursor\_state\_formatted](#method.cursor_state_formatted)(&self) -> [Vec](https://doc.rust-lang.org/nightly/alloc/vec/struct.Vec.html "struct alloc::vec::Vec")<[u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html)> ⓘ

Returns terminal escape sequences sufficient to set the current
cursor state of the terminal.

This is not typically necessary, since
[`contents_formatted`](struct.Screen.html#method.contents_formatted "method vt100::Screen::contents_formatted") will leave
the cursor in the correct state, but this can be useful in the case of
drawing additional things on top of a terminal output, since you will
need to restore the terminal state without the terminal contents
necessarily being the same.

Note that the bytes returned by this function may alter the active
drawing attributes, because it may require redrawing existing cells in
order to position the cursor correctly (for instance, in the case
where the cursor is past the end of a row). Therefore, you should
ensure to reset the active drawing attributes if necessary after
processing this data, for instance by using
[`attributes_formatted`](struct.Screen.html#method.attributes_formatted "method vt100::Screen::attributes_formatted").

[Source](../src/vt100/screen.rs.html#534-536)

#### pub fn [cell](#method.cell)(&self, row: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html), col: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html)) -> [Option](https://doc.rust-lang.org/nightly/core/option/enum.Option.html "enum core::option::Option")<&[Cell](struct.Cell.html "struct vt100::Cell")>

Returns the [`Cell`](struct.Cell.html "struct vt100::Cell") object at the given location in the
terminal, if it exists.

[Source](../src/vt100/screen.rs.html#540-544)

#### pub fn [row\_wrapped](#method.row_wrapped)(&self, row: [u16](https://doc.rust-lang.org/nightly/std/primitive.u16.html)) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether the text in row `row` should wrap to the next line.

[Source](../src/vt100/screen.rs.html#548-550)

#### pub fn [alternate\_screen](#method.alternate_screen)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether the alternate screen is currently in use.

[Source](../src/vt100/screen.rs.html#554-556)

#### pub fn [application\_keypad](#method.application_keypad)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether the terminal should be in application keypad mode.

[Source](../src/vt100/screen.rs.html#560-562)

#### pub fn [application\_cursor](#method.application_cursor)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether the terminal should be in application cursor mode.

[Source](../src/vt100/screen.rs.html#566-568)

#### pub fn [hide\_cursor](#method.hide_cursor)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether the terminal should be in hide cursor mode.

[Source](../src/vt100/screen.rs.html#572-574)

#### pub fn [bracketed\_paste](#method.bracketed_paste)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether the terminal should be in bracketed paste mode.

[Source](../src/vt100/screen.rs.html#578-580)

#### pub fn [mouse\_protocol\_mode](#method.mouse_protocol_mode)(&self) -> [MouseProtocolMode](enum.MouseProtocolMode.html "enum vt100::MouseProtocolMode")

Returns the currently active [`MouseProtocolMode`](enum.MouseProtocolMode.html "enum vt100::MouseProtocolMode").

[Source](../src/vt100/screen.rs.html#584-586)

#### pub fn [mouse\_protocol\_encoding](#method.mouse_protocol_encoding)(&self) -> [MouseProtocolEncoding](enum.MouseProtocolEncoding.html "enum vt100::MouseProtocolEncoding")

Returns the currently active [`MouseProtocolEncoding`](enum.MouseProtocolEncoding.html "enum vt100::MouseProtocolEncoding").

[Source](../src/vt100/screen.rs.html#590-592)

#### pub fn [fgcolor](#method.fgcolor)(&self) -> [Color](enum.Color.html "enum vt100::Color")

Returns the currently active foreground color.

[Source](../src/vt100/screen.rs.html#596-598)

#### pub fn [bgcolor](#method.bgcolor)(&self) -> [Color](enum.Color.html "enum vt100::Color")

Returns the currently active background color.

[Source](../src/vt100/screen.rs.html#603-605)

#### pub fn [bold](#method.bold)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether newly drawn text should be rendered with the bold text
attribute.

[Source](../src/vt100/screen.rs.html#610-612)

#### pub fn [dim](#method.dim)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether newly drawn text should be rendered with the dim text
attribute.

[Source](../src/vt100/screen.rs.html#617-619)

#### pub fn [italic](#method.italic)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether newly drawn text should be rendered with the italic
text attribute.

[Source](../src/vt100/screen.rs.html#624-626)

#### pub fn [underline](#method.underline)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether newly drawn text should be rendered with the
underlined text attribute.

[Source](../src/vt100/screen.rs.html#631-633)

#### pub fn [inverse](#method.inverse)(&self) -> [bool](https://doc.rust-lang.org/nightly/std/primitive.bool.html)

Returns whether newly drawn text should be rendered with the inverse
text attribute.

## Trait Implementations[§](#trait-implementations)

[Source](../src/vt100/screen.rs.html#54)[§](#impl-Clone-for-Screen)

### impl [Clone](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html "trait core::clone::Clone") for [Screen](struct.Screen.html "struct vt100::Screen")

[Source](../src/vt100/screen.rs.html#54)[§](#method.clone)

#### fn [clone](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html#tymethod.clone)(&self) -> [Screen](struct.Screen.html "struct vt100::Screen")

Returns a duplicate of the value. [Read more](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html#tymethod.clone)

1.0.0 · [Source](https://doc.rust-lang.org/nightly/src/core/clone.rs.html#245-247)[§](#method.clone_from)

#### fn [clone\_from](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html#method.clone_from)(&mut self, source: &Self)

Performs copy-assignment from `source`. [Read more](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html#method.clone_from)

[Source](../src/vt100/screen.rs.html#54)[§](#impl-Debug-for-Screen)

### impl [Debug](https://doc.rust-lang.org/nightly/core/fmt/trait.Debug.html "trait core::fmt::Debug") for [Screen](struct.Screen.html "struct vt100::Screen")

[Source](../src/vt100/screen.rs.html#54)[§](#method.fmt)

#### fn [fmt](https://doc.rust-lang.org/nightly/core/fmt/trait.Debug.html#tymethod.fmt)(&self, f: &mut [Formatter](https://doc.rust-lang.org/nightly/core/fmt/struct.Formatter.html "struct core::fmt::Formatter")<'\_>) -> [Result](https://doc.rust-lang.org/nightly/core/fmt/type.Result.html "type core::fmt::Result")

Formats the value using the given formatter. [Read more](https://doc.rust-lang.org/nightly/core/fmt/trait.Debug.html#tymethod.fmt)

## Auto Trait Implementations[§](#synthetic-implementations)

[§](#impl-Freeze-for-Screen)

### impl [Freeze](https://doc.rust-lang.org/nightly/core/marker/trait.Freeze.html "trait core::marker::Freeze") for [Screen](struct.Screen.html "struct vt100::Screen")

[§](#impl-RefUnwindSafe-for-Screen)

### impl [RefUnwindSafe](https://doc.rust-lang.org/nightly/core/panic/unwind_safe/trait.RefUnwindSafe.html "trait core::panic::unwind_safe::RefUnwindSafe") for [Screen](struct.Screen.html "struct vt100::Screen")

[§](#impl-Send-for-Screen)

### impl [Send](https://doc.rust-lang.org/nightly/core/marker/trait.Send.html "trait core::marker::Send") for [Screen](struct.Screen.html "struct vt100::Screen")

[§](#impl-Sync-for-Screen)

### impl [Sync](https://doc.rust-lang.org/nightly/core/marker/trait.Sync.html "trait core::marker::Sync") for [Screen](struct.Screen.html "struct vt100::Screen")

[§](#impl-Unpin-for-Screen)

### impl [Unpin](https://doc.rust-lang.org/nightly/core/marker/trait.Unpin.html "trait core::marker::Unpin") for [Screen](struct.Screen.html "struct vt100::Screen")

[§](#impl-UnwindSafe-for-Screen)

### impl [UnwindSafe](https://doc.rust-lang.org/nightly/core/panic/unwind_safe/trait.UnwindSafe.html "trait core::panic::unwind_safe::UnwindSafe") for [Screen](struct.Screen.html "struct vt100::Screen")

## Blanket Implementations[§](#blanket-implementations)

[Source](https://doc.rust-lang.org/nightly/src/core/any.rs.html#138)[§](#impl-Any-for-T)

### impl<T> [Any](https://doc.rust-lang.org/nightly/core/any/trait.Any.html "trait core::any::Any") for T where T: 'static + ?[Sized](https://doc.rust-lang.org/nightly/core/marker/trait.Sized.html "trait core::marker::Sized"),

[Source](https://doc.rust-lang.org/nightly/src/core/any.rs.html#139)[§](#method.type_id)

#### fn [type\_id](https://doc.rust-lang.org/nightly/core/any/trait.Any.html#tymethod.type_id)(&self) -> [TypeId](https://doc.rust-lang.org/nightly/core/any/struct.TypeId.html "struct core::any::TypeId")

Gets the `TypeId` of `self`. [Read more](https://doc.rust-lang.org/nightly/core/any/trait.Any.html#tymethod.type_id)

[Source](https://doc.rust-lang.org/nightly/src/core/borrow.rs.html#212)[§](#impl-Borrow%3CT%3E-for-T)

### impl<T> [Borrow](https://doc.rust-lang.org/nightly/core/borrow/trait.Borrow.html "trait core::borrow::Borrow")<T> for T where T: ?[Sized](https://doc.rust-lang.org/nightly/core/marker/trait.Sized.html "trait core::marker::Sized"),

[Source](https://doc.rust-lang.org/nightly/src/core/borrow.rs.html#214)[§](#method.borrow)

#### fn [borrow](https://doc.rust-lang.org/nightly/core/borrow/trait.Borrow.html#tymethod.borrow)(&self) -> [&T](https://doc.rust-lang.org/nightly/std/primitive.reference.html)

Immutably borrows from an owned value. [Read more](https://doc.rust-lang.org/nightly/core/borrow/trait.Borrow.html#tymethod.borrow)

[Source](https://doc.rust-lang.org/nightly/src/core/borrow.rs.html#221)[§](#impl-BorrowMut%3CT%3E-for-T)

### impl<T> [BorrowMut](https://doc.rust-lang.org/nightly/core/borrow/trait.BorrowMut.html "trait core::borrow::BorrowMut")<T> for T where T: ?[Sized](https://doc.rust-lang.org/nightly/core/marker/trait.Sized.html "trait core::marker::Sized"),

[Source](https://doc.rust-lang.org/nightly/src/core/borrow.rs.html#222)[§](#method.borrow_mut)

#### fn [borrow\_mut](https://doc.rust-lang.org/nightly/core/borrow/trait.BorrowMut.html#tymethod.borrow_mut)(&mut self) -> [&mut T](https://doc.rust-lang.org/nightly/std/primitive.reference.html)

Mutably borrows from an owned value. [Read more](https://doc.rust-lang.org/nightly/core/borrow/trait.BorrowMut.html#tymethod.borrow_mut)

[Source](https://doc.rust-lang.org/nightly/src/core/clone.rs.html#515)[§](#impl-CloneToUninit-for-T)

### impl<T> [CloneToUninit](https://doc.rust-lang.org/nightly/core/clone/trait.CloneToUninit.html "trait core::clone::CloneToUninit") for T where T: [Clone](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html "trait core::clone::Clone"),

[Source](https://doc.rust-lang.org/nightly/src/core/clone.rs.html#517)[§](#method.clone_to_uninit)

#### unsafe fn [clone\_to\_uninit](https://doc.rust-lang.org/nightly/core/clone/trait.CloneToUninit.html#tymethod.clone_to_uninit)(&self, dest: [\*mut](https://doc.rust-lang.org/nightly/std/primitive.pointer.html) [u8](https://doc.rust-lang.org/nightly/std/primitive.u8.html))

🔬This is a nightly-only experimental API. (`clone_to_uninit`)

Performs copy-assignment from `self` to `dest`. [Read more](https://doc.rust-lang.org/nightly/core/clone/trait.CloneToUninit.html#tymethod.clone_to_uninit)

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#785)[§](#impl-From%3CT%3E-for-T)

### impl<T> [From](https://doc.rust-lang.org/nightly/core/convert/trait.From.html "trait core::convert::From")<T> for T

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#788)[§](#method.from)

#### fn [from](https://doc.rust-lang.org/nightly/core/convert/trait.From.html#tymethod.from)(t: T) -> T

Returns the argument unchanged.

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#767-769)[§](#impl-Into%3CU%3E-for-T)

### impl<T, U> [Into](https://doc.rust-lang.org/nightly/core/convert/trait.Into.html "trait core::convert::Into")<U> for T where U: [From](https://doc.rust-lang.org/nightly/core/convert/trait.From.html "trait core::convert::From")<T>,

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#777)[§](#method.into)

#### fn [into](https://doc.rust-lang.org/nightly/core/convert/trait.Into.html#tymethod.into)(self) -> U

Calls `U::from(self)`.

That is, this conversion is whatever the implementation of
`[From](https://doc.rust-lang.org/nightly/core/convert/trait.From.html "trait core::convert::From")<T> for U` chooses to do.

[Source](https://doc.rust-lang.org/nightly/src/alloc/borrow.rs.html#85-87)[§](#impl-ToOwned-for-T)

### impl<T> [ToOwned](https://doc.rust-lang.org/nightly/alloc/borrow/trait.ToOwned.html "trait alloc::borrow::ToOwned") for T where T: [Clone](https://doc.rust-lang.org/nightly/core/clone/trait.Clone.html "trait core::clone::Clone"),

[Source](https://doc.rust-lang.org/nightly/src/alloc/borrow.rs.html#89)[§](#associatedtype.Owned)

#### type [Owned](https://doc.rust-lang.org/nightly/alloc/borrow/trait.ToOwned.html#associatedtype.Owned) = T

The resulting type after obtaining ownership.

[Source](https://doc.rust-lang.org/nightly/src/alloc/borrow.rs.html#90)[§](#method.to_owned)

#### fn [to\_owned](https://doc.rust-lang.org/nightly/alloc/borrow/trait.ToOwned.html#tymethod.to_owned)(&self) -> T

Creates owned data from borrowed data, usually by cloning. [Read more](https://doc.rust-lang.org/nightly/alloc/borrow/trait.ToOwned.html#tymethod.to_owned)

[Source](https://doc.rust-lang.org/nightly/src/alloc/borrow.rs.html#94)[§](#method.clone_into)

#### fn [clone\_into](https://doc.rust-lang.org/nightly/alloc/borrow/trait.ToOwned.html#method.clone_into)(&self, target: [&mut T](https://doc.rust-lang.org/nightly/std/primitive.reference.html))

Uses borrowed data to replace owned data, usually by cloning. [Read more](https://doc.rust-lang.org/nightly/alloc/borrow/trait.ToOwned.html#method.clone_into)

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#827-829)[§](#impl-TryFrom%3CU%3E-for-T)

### impl<T, U> [TryFrom](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html "trait core::convert::TryFrom")<U> for T where U: [Into](https://doc.rust-lang.org/nightly/core/convert/trait.Into.html "trait core::convert::Into")<T>,

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#831)[§](#associatedtype.Error-1)

#### type [Error](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html#associatedtype.Error) = [Infallible](https://doc.rust-lang.org/nightly/core/convert/enum.Infallible.html "enum core::convert::Infallible")

The type returned in the event of a conversion error.

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#834)[§](#method.try_from)

#### fn [try\_from](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html#tymethod.try_from)(value: U) -> [Result](https://doc.rust-lang.org/nightly/core/result/enum.Result.html "enum core::result::Result")<T, <T as [TryFrom](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html "trait core::convert::TryFrom")<U>>::[Error](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html#associatedtype.Error "type core::convert::TryFrom::Error")>

Performs the conversion.

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#811-813)[§](#impl-TryInto%3CU%3E-for-T)

### impl<T, U> [TryInto](https://doc.rust-lang.org/nightly/core/convert/trait.TryInto.html "trait core::convert::TryInto")<U> for T where U: [TryFrom](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html "trait core::convert::TryFrom")<T>,

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#815)[§](#associatedtype.Error)

#### type [Error](https://doc.rust-lang.org/nightly/core/convert/trait.TryInto.html#associatedtype.Error) = <U as [TryFrom](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html "trait core::convert::TryFrom")<T>>::[Error](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html#associatedtype.Error "type core::convert::TryFrom::Error")

The type returned in the event of a conversion error.

[Source](https://doc.rust-lang.org/nightly/src/core/convert/mod.rs.html#818)[§](#method.try_into)

#### fn [try\_into](https://doc.rust-lang.org/nightly/core/convert/trait.TryInto.html#tymethod.try_into)(self) -> [Result](https://doc.rust-lang.org/nightly/core/result/enum.Result.html "enum core::result::Result")<U, <U as [TryFrom](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html "trait core::convert::TryFrom")<T>>::[Error](https://doc.rust-lang.org/nightly/core/convert/trait.TryFrom.html#associatedtype.Error "type core::convert::TryFrom::Error")>

Performs the conversion.
