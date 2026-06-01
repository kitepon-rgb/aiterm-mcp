---
title: "pty — Pseudo-terminal utilities (Python stdlib)"
source_url: "https://docs.python.org/3/library/pty.html"
source_type: docs
fetched: 2026-06-01
topic: backends
tags: ["python", "pty", "openpty", "fork", "spawn", "master_read", "stdin_read"]
summary: "Python標準ライブラリptyの公式doc。openpty/fork/spawnと master_read・stdin_read コールバック(各既定1024バイト読取)を解説。"
relevance: "依存ゼロでPTYを握る最小経路。spawnのread/writeコールバック構造は pty_open/send/read/close の参照実装になる。"
chars: 7674
---

[ ]

[![Python logo](../_static/py.svg)](https://www.python.org/)

Theme
Auto
Light
Dark

### [Table of Contents](../contents.html)

* `pty` — Pseudo-terminal utilities
  + [Example](#example)

#### Previous topic

[`tty` — Terminal control functions](tty.html "previous chapter")

#### Next topic

[`fcntl` — The `fcntl` and `ioctl` system calls](fcntl.html "next chapter")

### This page

* [Report a bug](../bugs.html)
* [Improve this page](../improve-page-nojs.html)
* [Show source](https://github.com/python/cpython/blob/main/Doc/library/pty.rst?plain=1)

### Navigation

* [index](../genindex.html "General Index")
* [modules](../py-modindex.html "Python Module Index") |
* [next](fcntl.html "fcntl — The fcntl and ioctl system calls") |
* [previous](tty.html "tty — Terminal control functions") |
* ![Python logo](../_static/py.svg)
* [Python](https://www.python.org/) »

* [3.14.5 Documentation](../index.html) »
* [The Python Standard Library](index.html) »
* [Unix-specific services](unix.html) »
* `pty` — Pseudo-terminal utilities
* |
* Theme
  Auto
  Light
  Dark
   |

# `pty` — Pseudo-terminal utilities[¶](#module-pty "Link to this heading")

**Source code:** [Lib/pty.py](https://github.com/python/cpython/tree/3.14/Lib/pty.py)

---

The `pty` module defines operations for handling the pseudo-terminal
concept: starting another process and being able to write to and read from its
controlling terminal programmatically.

[Availability](intro.html#availability): Unix.

Pseudo-terminal handling is highly platform dependent. This code is mainly
tested on Linux, FreeBSD, and macOS (it is supposed to work on other POSIX
platforms but it’s not been thoroughly tested).

The `pty` module defines the following functions:

pty.fork()[¶](#pty.fork "Link to this definition")
:   Fork. Connect the child’s controlling terminal to a pseudo-terminal. Return
    value is `(pid, fd)`. Note that the child gets *pid* 0, and the *fd* is
    *invalid*. The parent’s return value is the *pid* of the child, and *fd* is a
    file descriptor connected to the child’s controlling terminal (and also to the
    child’s standard input and output).

    Warning

    On macOS the use of this function is unsafe when mixed with using
    higher-level system APIs, and that includes using [`urllib.request`](urllib.request.html#module-urllib.request "urllib.request: Extensible library for opening URLs.").

pty.openpty()[¶](#pty.openpty "Link to this definition")
:   Open a new pseudo-terminal pair, using [`os.openpty()`](os.html#os.openpty "os.openpty") if possible, or
    emulation code for generic Unix systems. Return a pair of file descriptors
    `(master, slave)`, for the master and the slave end, respectively.

pty.spawn(*argv*[, *master\_read*[, *stdin\_read*]])[¶](#pty.spawn "Link to this definition")
:   Spawn a process, and connect its controlling terminal with the current
    process’s standard io. This is often used to baffle programs which insist on
    reading from the controlling terminal. It is expected that the process
    spawned behind the pty will eventually terminate, and when it does *spawn*
    will return.

    A loop copies STDIN of the current process to the child and data received
    from the child to STDOUT of the current process. It is not signaled to the
    child if STDIN of the current process closes down.

    The functions *master\_read* and *stdin\_read* are passed a file descriptor
    which they should read from, and they should always return a byte string. In
    order to force spawn to return before the child process exits an
    empty byte array should be returned to signal end of file.

    The default implementation for both functions will read and return up to 1024
    bytes each time the function is called. The *master\_read* callback is passed
    the pseudoterminal’s master file descriptor to read output from the child
    process, and *stdin\_read* is passed file descriptor 0, to read from the
    parent process’s standard input.

    Returning an empty byte string from either callback is interpreted as an
    end-of-file (EOF) condition, and that callback will not be called after
    that. If *stdin\_read* signals EOF the controlling terminal can no longer
    communicate with the parent process OR the child process. Unless the child
    process will quit without any input, *spawn* will then loop forever. If
    *master\_read* signals EOF the same behavior results (on linux at least).

    Return the exit status value from [`os.waitpid()`](os.html#os.waitpid "os.waitpid") on the child process.

    [`os.waitstatus_to_exitcode()`](os.html#os.waitstatus_to_exitcode "os.waitstatus_to_exitcode") can be used to convert the exit status into
    an exit code.

    Raises an [auditing event](sys.html#auditing) `pty.spawn` with argument `argv`.

    Changed in version 3.4: `spawn()` now returns the status value from [`os.waitpid()`](os.html#os.waitpid "os.waitpid")
    on the child process.

## Example[¶](#example "Link to this heading")

The following program acts like the Unix command *[script(1)](https://manpages.debian.org/script%281%29)*, using a
pseudo-terminal to record all input and output of a terminal session in a
“typescript”.

```
import argparse
import os
import pty
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('-a', dest='append', action='store_true')
parser.add_argument('-p', dest='use_python', action='store_true')
parser.add_argument('filename', nargs='?', default='typescript')
options = parser.parse_args()

shell = sys.executable if options.use_python else os.environ.get('SHELL', 'sh')
filename = options.filename
mode = 'ab' if options.append else 'wb'

with open(filename, mode) as script:
    def read(fd):
        data = os.read(fd, 1024)
        script.write(data)
        return data

    print('Script started, file is', filename)
    script.write(('Script started on %s\n' % time.asctime()).encode())

    pty.spawn(shell, read)

    script.write(('Script done on %s\n' % time.asctime()).encode())
    print('Script done, file is', filename)
```

### [Table of Contents](../contents.html)

* `pty` — Pseudo-terminal utilities
  + [Example](#example)

#### Previous topic

[`tty` — Terminal control functions](tty.html "previous chapter")

#### Next topic

[`fcntl` — The `fcntl` and `ioctl` system calls](fcntl.html "next chapter")

### This page

* [Report a bug](../bugs.html)
* [Improve this page](../improve-page-nojs.html)
* [Show source](https://github.com/python/cpython/blob/main/Doc/library/pty.rst?plain=1)

«

### Navigation

* [index](../genindex.html "General Index")
* [modules](../py-modindex.html "Python Module Index") |
* [next](fcntl.html "fcntl — The fcntl and ioctl system calls") |
* [previous](tty.html "tty — Terminal control functions") |
* ![Python logo](../_static/py.svg)
* [Python](https://www.python.org/) »

* [3.14.5 Documentation](../index.html) »
* [The Python Standard Library](index.html) »
* [Unix-specific services](unix.html) »
* `pty` — Pseudo-terminal utilities
* |
* Theme
  Auto
  Light
  Dark
   |

© [Copyright](../copyright.html) 2001 Python Software Foundation.

This page is licensed under the Python Software Foundation License Version 2.

Examples, recipes, and other code in the documentation are additionally licensed under the Zero Clause BSD License.

See [History and License](/license.html) for more information.

The Python Software Foundation is a non-profit corporation.
[Please donate.](https://www.python.org/psf/donations/)

Last updated on May 31, 2026 (20:19 UTC).
[Found a bug](/bugs.html)?

Created using [Sphinx](https://www.sphinx-doc.org/) 8.2.3.
