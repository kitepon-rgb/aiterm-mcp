---
title: "pyte Tutorial - Screen と Stream で端末を再現する"
source_url: "https://pyte.readthedocs.io/en/latest/tutorial.html"
source_type: docs
fetched: 2026-06-01
topic: ansi-handling
tags: ["pyte", "screen", "stream", "display", "api", "tutorial"]
summary: "Stream.feed()でバイトを流しScreen.displayで描画済みテキスト行を読む、という仮想端末の最小APIフローを示す公式チュートリアル。"
relevance: "我々のpty_read実装の具体形そのもの。バイト供給→画面状態→確定テキスト抽出のインターフェース設計を直接写せる。"
chars: 3997
---

[pyte](index.html)

latest

* Tutorial
* [API reference](api.html)
* [pyte Changelog](changelog.html)

[pyte](index.html)

* [Docs](index.html) »
* Tutorial
* [Edit on GitHub](https://github.com/selectel/pyte/blob/master/docs/tutorial.rst)

---

# Tutorial[¶](#tutorial "Permalink to this headline")

There are two important classes in `pyte`: [`Screen`](api.html#pyte.screens.Screen "pyte.screens.Screen")
and `Stream`. The Screen is the terminal screen
emulator. It maintains an in-memory buffer of text and text-attributes
to display. The Stream is the stream processor. It processes the input
and dispatches events. Events are things like `LINEFEED`, `DRAW "a"`,
or `CURSOR_POSITION 10 10`. See the [API reference](api.html#api) for more
details.

In general, if you just want to know what’s being displayed on screen you
can do something like the following:

```
>>> from __future__ import unicode_literals
>>> import pyte
>>> screen = pyte.Screen(80, 24)
>>> stream = pyte.Stream(screen)
>>> stream.feed(b"Hello World!")
>>> screen.display
    ['Hello World!                                                                    ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ',
     '                                                                                ']
```

**Note**: `Screen` has no idea what is the source of bytes fed into `Stream`,
so, obviously, it **can’t read** or **change** environment variables, which implies
that:

* it doesn’t adjust LINES and COLUMNS on `"resize"` event;
* it doesn’t use locale settings (LC\_\* and LANG);
* it doesn’t use TERM value and expects it to be “linux” and only “linux”.

And that’s it for Hello World! Head over to the [examples](https://github.com/selectel/pyte/tree/master/examples) for more.

[Next](api.html "API reference")
 [Previous](index.html "What is pyte?")

---

© Copyright 2011-2012 Selectel, 2012-2017 pyte authors and contributors.
Revision `a267d4ae`.

Built with [Sphinx](http://sphinx-doc.org/) using a [theme](https://github.com/rtfd/sphinx_rtd_theme) provided by [Read the Docs](https://readthedocs.org).
