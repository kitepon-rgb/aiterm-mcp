---
title: "Core pexpect components — API reference"
source_url: "https://pexpect.readthedocs.io/en/stable/api/pexpect.html"
source_type: docs
fetched: 2026-06-01
topic: backends
tags: ["pexpect", "spawn", "expect", "expect_exact", "read_nonblocking", "timeout", "EOF", "TIMEOUT"]
summary: "pexpectのAPIリファレンス。spawn、expect/expect_exact、read_nonblocking、timeout、EOF/TIMEOUT例外を網羅。"
relevance: "出力パターン待ち(expect)とノンブロッキング読取・タイムアウトの仕様。quiescenceベース完了境界検出の代替/補完手法の一次資料。"
chars: 44619
---

[Pexpect](../index.html)

stable

* [Installation](../install.html)
* [API Overview](../overview.html)
* [API documentation](index.html)
  + Core pexpect components
    - [spawn class](#spawn-class)
      * [Controlling the child process](#controlling-the-child-process)
      * [Handling unicode](#handling-unicode)
    - [run function](#run-function)
    - [Exceptions](#exceptions)
    - [Utility functions](#utility-functions)
  + [fdpexpect - use pexpect with a file descriptor](fdpexpect.html)
  + [popen\_spawn - use pexpect with a piped subprocess](popen_spawn.html)
  + [replwrap - Control read-eval-print-loops](replwrap.html)
  + [pxssh - control an SSH session](pxssh.html)
* [Examples](../examples.html)
* [FAQ](../FAQ.html)
* [Common problems](../commonissues.html)
* [History](../history.html)

[Pexpect](../index.html)

* [Docs](../index.html) »
* [API documentation](index.html) »
* Core pexpect components
* [Edit on GitHub](https://github.com/pexpect/pexpect/blob/5eed1a31a2853a09b7367c59fbd1a4a0b53341df/doc/api/pexpect.rst)

---

# Core pexpect components[¶](#module-pexpect "Permalink to this headline")

Pexpect is a Python module for spawning child applications and controlling
them automatically. Pexpect can be used for automating interactive applications
such as ssh, ftp, passwd, telnet, etc. It can be used to a automate setup
scripts for duplicating software package installations on different servers. It
can be used for automated software testing. Pexpect is in the spirit of Don
Libes’ Expect, but Pexpect is pure Python. Other Expect-like modules for Python
require TCL and Expect or require C extensions to be compiled. Pexpect does not
use C, Expect, or TCL extensions. It should work on any platform that supports
the standard Python pty module. The Pexpect interface focuses on ease of use so
that simple tasks are easy.

There are two main interfaces to the Pexpect system; these are the function,
run() and the class, spawn. The spawn class is more powerful. The run()
function is simpler than spawn, and is good for quickly calling program. When
you call the run() function it executes a given program and then returns the
output. This is a handy replacement for os.system().

For example:

```
pexpect.run('ls -la')
```

The spawn class is the more powerful interface to the Pexpect system. You can
use this to spawn a child program then interact with it by sending input and
expecting responses (waiting for patterns in the child’s output).

For example:

```
child = pexpect.spawn('scp foo user@example.com:.')
child.expect('Password:')
child.sendline(mypassword)
```

This works even for commands that ask for passwords or other input outside of
the normal stdio streams. For example, ssh reads input directly from the TTY
device which bypasses stdin.

Credits: Noah Spurrier, Richard Holden, Marco Molteni, Kimberley Burchett,
Robert Stone, Hartmut Goebel, Chad Schroeder, Erick Tryzelaar, Dave Kirby, Ids
vander Molen, George Todd, Noel Taylor, Nicolas D. Cesar, Alexander Gattin,
Jacques-Etienne Baudoux, Geoffrey Marshall, Francisco Lourenco, Glen Mabey,
Karthik Gurusamy, Fernando Perez, Corey Minyard, Jon Cohen, Guillaume
Chazarain, Andrew Ryan, Nick Craig-Wood, Andrew Stone, Jorgen Grahn, John
Spiegel, Jan Grant, and Shane Kerr. Let me know if I forgot anyone.

Pexpect is free, open source, and all that good stuff.
<http://pexpect.sourceforge.net/>

PEXPECT LICENSE

> This license is approved by the OSI and FSF as GPL-compatible.
> :   <http://opensource.org/licenses/isc-license.txt>
>
> Copyright (c) 2012, Noah Spurrier <noah@noah.org>
> PERMISSION TO USE, COPY, MODIFY, AND/OR DISTRIBUTE THIS SOFTWARE FOR ANY
> PURPOSE WITH OR WITHOUT FEE IS HEREBY GRANTED, PROVIDED THAT THE ABOVE
> COPYRIGHT NOTICE AND THIS PERMISSION NOTICE APPEAR IN ALL COPIES.
> THE SOFTWARE IS PROVIDED “AS IS” AND THE AUTHOR DISCLAIMS ALL WARRANTIES
> WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
> MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
> ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
> WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
> ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
> OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## spawn class[¶](#spawn-class "Permalink to this headline")

*class* `pexpect.``spawn`(*command*, *args=[]*, *timeout=30*, *maxread=2000*, *searchwindowsize=None*, *logfile=None*, *cwd=None*, *env=None*, *ignore\_sighup=False*, *echo=True*, *preexec\_fn=None*, *encoding=None*, *codec\_errors='strict'*, *dimensions=None*, *use\_poll=False*)[[source]](../_modules/pexpect/pty_spawn.html#spawn)[¶](#pexpect.spawn "Permalink to this definition")
:   This is the main class interface for Pexpect. Use this class to start
    and control child applications.

    `__init__`(*command*, *args=[]*, *timeout=30*, *maxread=2000*, *searchwindowsize=None*, *logfile=None*, *cwd=None*, *env=None*, *ignore\_sighup=False*, *echo=True*, *preexec\_fn=None*, *encoding=None*, *codec\_errors='strict'*, *dimensions=None*, *use\_poll=False*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.__init__)[¶](#pexpect.spawn.__init__ "Permalink to this definition")
    :   This is the constructor. The command parameter may be a string that
        includes a command and any arguments to the command. For example:

        ```
        child = pexpect.spawn('/usr/bin/ftp')
        child = pexpect.spawn('/usr/bin/ssh user@example.com')
        child = pexpect.spawn('ls -latr /tmp')
        ```

        You may also construct it with a list of arguments like so:

        ```
        child = pexpect.spawn('/usr/bin/ftp', [])
        child = pexpect.spawn('/usr/bin/ssh', ['user@example.com'])
        child = pexpect.spawn('ls', ['-latr', '/tmp'])
        ```

        After this the child application will be created and will be ready to
        talk to. For normal use, see expect() and send() and sendline().

        Remember that Pexpect does NOT interpret shell meta characters such as
        redirect, pipe, or wild cards (`>`, `|`, or `*`). This is a
        common mistake. If you want to run a command and pipe it through
        another command then you must also start a shell. For example:

        ```
        child = pexpect.spawn('/bin/bash -c "ls -l | grep LOG > logs.txt"')
        child.expect(pexpect.EOF)
        ```

        The second form of spawn (where you pass a list of arguments) is useful
        in situations where you wish to spawn a command and pass it its own
        argument list. This can make syntax more clear. For example, the
        following is equivalent to the previous example:

        ```
        shell_cmd = 'ls -l | grep LOG > logs.txt'
        child = pexpect.spawn('/bin/bash', ['-c', shell_cmd])
        child.expect(pexpect.EOF)
        ```

        The maxread attribute sets the read buffer size. This is maximum number
        of bytes that Pexpect will try to read from a TTY at one time. Setting
        the maxread size to 1 will turn off buffering. Setting the maxread
        value higher may help performance in cases where large amounts of
        output are read back from the child. This feature is useful in
        conjunction with searchwindowsize.

        When the keyword argument *searchwindowsize* is None (default), the
        full buffer is searched at each iteration of receiving incoming data.
        The default number of bytes scanned at each iteration is very large
        and may be reduced to collaterally reduce search cost. After
        [`expect()`](#pexpect.spawn.expect "pexpect.spawn.expect") returns, the full buffer attribute remains up to
        size *maxread* irrespective of *searchwindowsize* value.

        When the keyword argument `timeout` is specified as a number,
        (default: *30*), then [`TIMEOUT`](#pexpect.TIMEOUT "pexpect.TIMEOUT") will be raised after the value
        specified has elapsed, in seconds, for any of the [`expect()`](#pexpect.spawn.expect "pexpect.spawn.expect")
        family of method calls. When None, TIMEOUT will not be raised, and
        [`expect()`](#pexpect.spawn.expect "pexpect.spawn.expect") may block indefinitely until match.

        The logfile member turns on or off logging. All input and output will
        be copied to the given file object. Set logfile to None to stop
        logging. This is the default. Set logfile to sys.stdout to echo
        everything to standard output. The logfile is flushed after each write.

        Example log input and output to a file:

        ```
        child = pexpect.spawn('some_command')
        fout = open('mylog.txt','wb')
        child.logfile = fout
        ```

        Example log to stdout:

        ```
        # In Python 2:
        child = pexpect.spawn('some_command')
        child.logfile = sys.stdout

        # In Python 3, we'll use the ``encoding`` argument to decode data
        # from the subprocess and handle it as unicode:
        child = pexpect.spawn('some_command', encoding='utf-8')
        child.logfile = sys.stdout
        ```

        The logfile\_read and logfile\_send members can be used to separately log
        the input from the child and output sent to the child. Sometimes you
        don’t want to see everything you write to the child. You only want to
        log what the child sends back. For example:

        ```
        child = pexpect.spawn('some_command')
        child.logfile_read = sys.stdout
        ```

        You will need to pass an encoding to spawn in the above code if you are
        using Python 3.

        To separately log output sent to the child use logfile\_send:

        ```
        child.logfile_send = fout
        ```

        If `ignore_sighup` is True, the child process will ignore SIGHUP
        signals. The default is False from Pexpect 4.0, meaning that SIGHUP
        will be handled normally by the child.

        The delaybeforesend helps overcome a weird behavior that many users
        were experiencing. The typical problem was that a user would expect() a
        “Password:” prompt and then immediately call sendline() to send the
        password. The user would then see that their password was echoed back
        to them. Passwords don’t normally echo. The problem is caused by the
        fact that most applications print out the “Password” prompt and then
        turn off stdin echo, but if you send your password before the
        application turned off echo, then you get your password echoed.
        Normally this wouldn’t be a problem when interacting with a human at a
        real keyboard. If you introduce a slight delay just before writing then
        this seems to clear up the problem. This was such a common problem for
        many users that I decided that the default pexpect behavior should be
        to sleep just before writing to the child application. 1/20th of a
        second (50 ms) seems to be enough to clear up the problem. You can set
        delaybeforesend to None to return to the old behavior.

        Note that spawn is clever about finding commands on your path.
        It uses the same logic that “which” uses to find executables.

        If you wish to get the exit status of the child you must call the
        close() method. The exit or signal status of the child will be stored
        in self.exitstatus or self.signalstatus. If the child exited normally
        then exitstatus will store the exit return code and signalstatus will
        be None. If the child was terminated abnormally with a signal then
        signalstatus will store the signal value and exitstatus will be None:

        ```
        child = pexpect.spawn('some_command')
        child.close()
        print(child.exitstatus, child.signalstatus)
        ```

        If you need more detail you can also read the self.status member which
        stores the status returned by os.waitpid. You can interpret this using
        os.WIFEXITED/os.WEXITSTATUS or os.WIFSIGNALED/os.TERMSIG.

        The echo attribute may be set to False to disable echoing of input.
        As a pseudo-terminal, all input echoed by the “keyboard” (send()
        or sendline()) will be repeated to output. For many cases, it is
        not desirable to have echo enabled, and it may be later disabled
        using setecho(False) followed by waitnoecho(). However, for some
        platforms such as Solaris, this is not possible, and should be
        disabled immediately on spawn.

        If preexec\_fn is given, it will be called in the child process before
        launching the given command. This is useful to e.g. reset inherited
        signal handlers.

        The dimensions attribute specifies the size of the pseudo-terminal as
        seen by the subprocess, and is specified as a two-entry tuple (rows,
        columns). If this is unspecified, the defaults in ptyprocess will apply.

        The use\_poll attribute enables using select.poll() over select.select()
        for socket handling. This is handy if your system could have > 1024 fds

    `expect`(*pattern*, *timeout=-1*, *searchwindowsize=-1*, *async\_=False*, *\*\*kw*)[¶](#pexpect.spawn.expect "Permalink to this definition")
    :   This seeks through the stream until a pattern is matched. The
        pattern is overloaded and may take several types. The pattern can be a
        StringType, EOF, a compiled re, or a list of any of those types.
        Strings will be compiled to re types. This returns the index into the
        pattern list. If the pattern was not a list this returns index 0 on a
        successful match. This may raise exceptions for EOF or TIMEOUT. To
        avoid the EOF or TIMEOUT exceptions add EOF or TIMEOUT to the pattern
        list. That will cause expect to match an EOF or TIMEOUT condition
        instead of raising an exception.

        If you pass a list of patterns and more than one matches, the first
        match in the stream is chosen. If more than one pattern matches at that
        point, the leftmost in the pattern list is chosen. For example:

        ```
        # the input is 'foobar'
        index = p.expect(['bar', 'foo', 'foobar'])
        # returns 1('foo') even though 'foobar' is a "better" match
        ```

        Please note, however, that buffering can affect this behavior, since
        input arrives in unpredictable chunks. For example:

        ```
        # the input is 'foobar'
        index = p.expect(['foobar', 'foo'])
        # returns 0('foobar') if all input is available at once,
        # but returns 1('foo') if parts of the final 'bar' arrive late
        ```

        When a match is found for the given pattern, the class instance
        attribute *match* becomes an re.MatchObject result. Should an EOF
        or TIMEOUT pattern match, then the match attribute will be an instance
        of that exception class. The pairing before and after class
        instance attributes are views of the data preceding and following
        the matching pattern. On general exception, class attribute
        *before* is all data received up to the exception, while *match* and
        *after* attributes are value None.

        When the keyword argument timeout is -1 (default), then TIMEOUT will
        raise after the default value specified by the class timeout
        attribute. When None, TIMEOUT will not be raised and may block
        indefinitely until match.

        When the keyword argument searchwindowsize is -1 (default), then the
        value specified by the class maxread attribute is used.

        A list entry may be EOF or TIMEOUT instead of a string. This will
        catch these exceptions and return the index of the list entry instead
        of raising the exception. The attribute ‘after’ will be set to the
        exception type. The attribute ‘match’ will be None. This allows you to
        write code like this:

        ```
        index = p.expect(['good', 'bad', pexpect.EOF, pexpect.TIMEOUT])
        if index == 0:
            do_something()
        elif index == 1:
            do_something_else()
        elif index == 2:
            do_some_other_thing()
        elif index == 3:
            do_something_completely_different()
        ```

        instead of code like this:

        ```
        try:
            index = p.expect(['good', 'bad'])
            if index == 0:
                do_something()
            elif index == 1:
                do_something_else()
        except EOF:
            do_some_other_thing()
        except TIMEOUT:
            do_something_completely_different()
        ```

        These two forms are equivalent. It all depends on what you want. You
        can also just expect the EOF if you are waiting for all output of a
        child to finish. For example:

        ```
        p = pexpect.spawn('/bin/ls')
        p.expect(pexpect.EOF)
        print p.before
        ```

        If you are trying to optimize for speed then see expect\_list().

        On Python 3.4, or Python 3.3 with asyncio installed, passing
        `async_=True` will make this return an [`asyncio`](https://docs.python.org/3/library/asyncio.html#module-asyncio "(in Python v3.8)") coroutine,
        which you can yield from to get the same result that this method would
        normally give directly. So, inside a coroutine, you can replace this code:

        ```
        index = p.expect(patterns)
        ```

        With this non-blocking form:

        ```
        index = yield from p.expect(patterns, async_=True)
        ```

    `expect_exact`(*pattern\_list*, *timeout=-1*, *searchwindowsize=-1*, *async\_=False*, *\*\*kw*)[¶](#pexpect.spawn.expect_exact "Permalink to this definition")
    :   This is similar to expect(), but uses plain string matching instead
        of compiled regular expressions in ‘pattern\_list’. The ‘pattern\_list’
        may be a string; a list or other sequence of strings; or TIMEOUT and
        EOF.

        This call might be faster than expect() for two reasons: string
        searching is faster than RE matching and it is possible to limit the
        search to just the end of the input buffer.

        This method is also useful when you don’t want to have to worry about
        escaping regular expression characters that you want to match.

        Like [`expect()`](#pexpect.spawn.expect "pexpect.spawn.expect"), passing `async_=True` will make this return an
        asyncio coroutine.

    `expect_list`(*pattern\_list*, *timeout=-1*, *searchwindowsize=-1*, *async\_=False*, *\*\*kw*)[¶](#pexpect.spawn.expect_list "Permalink to this definition")
    :   This takes a list of compiled regular expressions and returns the
        index into the pattern\_list that matched the child output. The list may
        also contain EOF or TIMEOUT(which are not compiled regular
        expressions). This method is similar to the expect() method except that
        expect\_list() does not recompile the pattern list on every call. This
        may help if you are trying to optimize for speed, otherwise just use
        the expect() method. This is called by expect().

        Like [`expect()`](#pexpect.spawn.expect "pexpect.spawn.expect"), passing `async_=True` will make this return an
        asyncio coroutine.

    `compile_pattern_list`(*patterns*)[¶](#pexpect.spawn.compile_pattern_list "Permalink to this definition")
    :   This compiles a pattern-string or a list of pattern-strings.
        Patterns must be a StringType, EOF, TIMEOUT, SRE\_Pattern, or a list of
        those. Patterns may also be None which results in an empty list (you
        might do this if waiting for an EOF or TIMEOUT condition without
        expecting any pattern).

        This is used by expect() when calling expect\_list(). Thus expect() is
        nothing more than:

        ```
        cpl = self.compile_pattern_list(pl)
        return self.expect_list(cpl, timeout)
        ```

        If you are using expect() within a loop it may be more
        efficient to compile the patterns first and then call expect\_list().
        This avoid calls in a loop to compile\_pattern\_list():

        ```
        cpl = self.compile_pattern_list(my_pattern)
        while some_condition:
           ...
           i = self.expect_list(cpl, timeout)
           ...
        ```

    `send`(*s*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.send)[¶](#pexpect.spawn.send "Permalink to this definition")
    :   Sends string `s` to the child process, returning the number of
        bytes written. If a logfile is specified, a copy is written to that
        log.

        The default terminal input mode is canonical processing unless set
        otherwise by the child process. This allows backspace and other line
        processing to be performed prior to transmitting to the receiving
        program. As this is buffered, there is a limited size of such buffer.

        On Linux systems, this is 4096 (defined by N\_TTY\_BUF\_SIZE). All
        other systems honor the POSIX.1 definition PC\_MAX\_CANON – 1024
        on OSX, 256 on OpenSolaris, and 1920 on FreeBSD.

        This value may be discovered using fpathconf(3):

        ```
        >>> from os import fpathconf
        >>> print(fpathconf(0, 'PC_MAX_CANON'))
        256
        ```

        On such a system, only 256 bytes may be received per line. Any
        subsequent bytes received will be discarded. BEL (`''`) is then
        sent to output if IMAXBEL (termios.h) is set by the tty driver.
        This is usually enabled by default. Linux does not honor this as
        an option – it behaves as though it is always set on.

        Canonical input processing may be disabled altogether by executing
        a shell, then stty(1), before executing the final program:

        ```
        >>> bash = pexpect.spawn('/bin/bash', echo=False)
        >>> bash.sendline('stty -icanon')
        >>> bash.sendline('base64')
        >>> bash.sendline('x' * 5000)
        ```

    `sendline`(*s=''*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.sendline)[¶](#pexpect.spawn.sendline "Permalink to this definition")
    :   Wraps send(), sending string `s` to child process, with
        `os.linesep` automatically appended. Returns number of bytes
        written. Only a limited number of bytes may be sent for each
        line in the default terminal mode, see docstring of [`send()`](#pexpect.spawn.send "pexpect.spawn.send").

    `write`(*s*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.write)[¶](#pexpect.spawn.write "Permalink to this definition")
    :   This is similar to send() except that there is no return value.

    `writelines`(*sequence*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.writelines)[¶](#pexpect.spawn.writelines "Permalink to this definition")
    :   This calls write() for each element in the sequence. The sequence
        can be any iterable object producing strings, typically a list of
        strings. This does not add line separators. There is no return value.

    `sendcontrol`(*char*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.sendcontrol)[¶](#pexpect.spawn.sendcontrol "Permalink to this definition")
    :   Helper method that wraps send() with mnemonic access for sending control
        character to the child (such as Ctrl-C or Ctrl-D). For example, to send
        Ctrl-G (ASCII 7, bell, ‘’):

        ```
        child.sendcontrol('g')
        ```

        See also, sendintr() and sendeof().

    `sendeof`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.sendeof)[¶](#pexpect.spawn.sendeof "Permalink to this definition")
    :   This sends an EOF to the child. This sends a character which causes
        the pending parent output buffer to be sent to the waiting child
        program without waiting for end-of-line. If it is the first character
        of the line, the read() in the user program returns 0, which signifies
        end-of-file. This means to work as expected a sendeof() has to be
        called at the beginning of a line. This method does not send a newline.
        It is the responsibility of the caller to ensure the eof is sent at the
        beginning of a line.

    `sendintr`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.sendintr)[¶](#pexpect.spawn.sendintr "Permalink to this definition")
    :   This sends a SIGINT to the child. It does not require
        the SIGINT to be the first character on a line.

    `read`(*size=-1*)[¶](#pexpect.spawn.read "Permalink to this definition")
    :   This reads at most “size” bytes from the file (less if the read hits
        EOF before obtaining size bytes). If the size argument is negative or
        omitted, read all data until EOF is reached. The bytes are returned as
        a string object. An empty string is returned when EOF is encountered
        immediately.

    `readline`(*size=-1*)[¶](#pexpect.spawn.readline "Permalink to this definition")
    :   This reads and returns one entire line. The newline at the end of
        line is returned as part of the string, unless the file ends without a
        newline. An empty string is returned if EOF is encountered immediately.
        This looks for a newline as a CR/LF pair (rn) even on UNIX because
        this is what the pseudotty device returns. So contrary to what you may
        expect you will receive newlines as rn.

        If the size argument is 0 then an empty string is returned. In all
        other cases the size argument is ignored, which is not standard
        behavior for a file-like object.

    `read_nonblocking`(*size=1*, *timeout=-1*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.read_nonblocking)[¶](#pexpect.spawn.read_nonblocking "Permalink to this definition")
    :   This reads at most size characters from the child application. It
        includes a timeout. If the read does not complete within the timeout
        period then a TIMEOUT exception is raised. If the end of file is read
        then an EOF exception will be raised. If a logfile is specified, a
        copy is written to that log.

        If timeout is None then the read may block indefinitely.
        If timeout is -1 then the self.timeout value is used. If timeout is 0
        then the child is polled and if there is no data immediately ready
        then this will raise a TIMEOUT exception.

        The timeout refers only to the amount of time to read at least one
        character. This is not affected by the ‘size’ parameter, so if you call
        read\_nonblocking(size=100, timeout=30) and only one character is
        available right away then one character will be returned immediately.
        It will not wait for 30 seconds for another 99 characters to come in.

        On the other hand, if there are bytes available to read immediately,
        all those bytes will be read (up to the buffer size). So, if the
        buffer size is 1 megabyte and there is 1 megabyte of data available
        to read, the buffer will be filled, regardless of timeout.

        This is a wrapper around os.read(). It uses select.select() or
        select.poll() to implement the timeout.

    `eof`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.eof)[¶](#pexpect.spawn.eof "Permalink to this definition")
    :   This returns True if the EOF exception was ever raised.

    `interact`(*escape\_character='\x1d'*, *input\_filter=None*, *output\_filter=None*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.interact)[¶](#pexpect.spawn.interact "Permalink to this definition")
    :   This gives control of the child process to the interactive user (the
        human at the keyboard). Keystrokes are sent to the child process, and
        the stdout and stderr output of the child process is printed. This
        simply echos the child stdout and child stderr to the real stdout and
        it echos the real stdin to the child stdin. When the user types the
        escape\_character this method will return None. The escape\_character
        will not be transmitted. The default for escape\_character is
        entered as `Ctrl - ]`, the very same as BSD telnet. To prevent
        escaping, escape\_character may be set to None.

        If a logfile is specified, then the data sent and received from the
        child process in interact mode is duplicated to the given log.

        You may pass in optional input and output filter functions. These
        functions should take bytes array and return bytes array too. Even
        with `encoding='utf-8'` support, meth:interact will always pass
        input\_filter and output\_filter bytes. You may need to wrap your
        function to decode and encode back to UTF-8.

        The output\_filter will be passed all the output from the child process.
        The input\_filter will be passed all the keyboard input from the user.
        The input\_filter is run BEFORE the check for the escape\_character.

        Note that if you change the window size of the parent the SIGWINCH
        signal will not be passed through to the child. If you want the child
        window size to change when the parent’s window size changes then do
        something like the following example:

        ```
        import pexpect, struct, fcntl, termios, signal, sys
        def sigwinch_passthrough (sig, data):
            s = struct.pack("HHHH", 0, 0, 0, 0)
            a = struct.unpack('hhhh', fcntl.ioctl(sys.stdout.fileno(),
                termios.TIOCGWINSZ , s))
            if not p.closed:
                p.setwinsize(a[0],a[1])

        # Note this 'p' is global and used in sigwinch_passthrough.
        p = pexpect.spawn('/bin/bash')
        signal.signal(signal.SIGWINCH, sigwinch_passthrough)
        p.interact()
        ```

    `logfile`[¶](#pexpect.spawn.logfile "Permalink to this definition")

    `logfile_read`[¶](#pexpect.spawn.logfile_read "Permalink to this definition")

    `logfile_send`[¶](#pexpect.spawn.logfile_send "Permalink to this definition")
    :   Set these to a Python file object (or [`sys.stdout`](https://docs.python.org/3/library/sys.html#sys.stdout "(in Python v3.8)")) to log all
        communication, data read from the child process, or data sent to the child
        process.

        Note

        With [`spawn`](#pexpect.spawn "pexpect.spawn") in bytes mode, the log files should be open for
        writing binary data. In unicode mode, they should
        be open for writing unicode text. See [Handling unicode](#unicode).

### Controlling the child process[¶](#controlling-the-child-process "Permalink to this headline")

*class* `pexpect.``spawn`[[source]](../_modules/pexpect/pty_spawn.html#spawn)
:   `kill`(*sig*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.kill)[¶](#pexpect.spawn.kill "Permalink to this definition")
    :   This sends the given signal to the child application. In keeping
        with UNIX tradition it has a misleading name. It does not necessarily
        kill the child unless you send the right signal.

    `terminate`(*force=False*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.terminate)[¶](#pexpect.spawn.terminate "Permalink to this definition")
    :   This forces a child process to terminate. It starts nicely with
        SIGHUP and SIGINT. If “force” is True then moves onto SIGKILL. This
        returns True if the child was terminated. This returns False if the
        child could not be terminated.

    `isalive`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.isalive)[¶](#pexpect.spawn.isalive "Permalink to this definition")
    :   This tests if the child process is running or not. This is
        non-blocking. If the child was terminated then this will read the
        exitstatus or signalstatus of the child. This returns True if the child
        process appears to be running or False if not. It can take literally
        SECONDS for Solaris to return the right status.

    `wait`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.wait)[¶](#pexpect.spawn.wait "Permalink to this definition")
    :   This waits until the child exits. This is a blocking call. This will
        not read any data from the child, so this will block forever if the
        child has unread output and has terminated. In other words, the child
        may have printed output then called exit(), but, the child is
        technically still alive until its output is read by the parent.

        This method is non-blocking if [`wait()`](#pexpect.spawn.wait "pexpect.spawn.wait") has already been called
        previously or [`isalive()`](#pexpect.spawn.isalive "pexpect.spawn.isalive") method returns False. It simply returns
        the previously determined exit status.

    `close`(*force=True*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.close)[¶](#pexpect.spawn.close "Permalink to this definition")
    :   This closes the connection with the child application. Note that
        calling close() more than once is valid. This emulates standard Python
        behavior with files. Set force to True if you want to make sure that
        the child is terminated (SIGKILL is sent if the child ignores SIGHUP
        and SIGINT).

    `getwinsize`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.getwinsize)[¶](#pexpect.spawn.getwinsize "Permalink to this definition")
    :   This returns the terminal window size of the child tty. The return
        value is a tuple of (rows, cols).

    `setwinsize`(*rows*, *cols*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.setwinsize)[¶](#pexpect.spawn.setwinsize "Permalink to this definition")
    :   This sets the terminal window size of the child tty. This will cause
        a SIGWINCH signal to be sent to the child. This does not change the
        physical window size. It changes the size reported to TTY-aware
        applications like vi or curses – applications that respond to the
        SIGWINCH signal.

    `getecho`()[[source]](../_modules/pexpect/pty_spawn.html#spawn.getecho)[¶](#pexpect.spawn.getecho "Permalink to this definition")
    :   This returns the terminal echo mode. This returns True if echo is
        on or False if echo is off. Child applications that are expecting you
        to enter a password often set ECHO False. See waitnoecho().

        Not supported on platforms where `isatty()` returns False.

    `setecho`(*state*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.setecho)[¶](#pexpect.spawn.setecho "Permalink to this definition")
    :   This sets the terminal echo mode on or off. Note that anything the
        child sent before the echo will be lost, so you should be sure that
        your input buffer is empty before you call setecho(). For example, the
        following will work as expected:

        ```
        p = pexpect.spawn('cat') # Echo is on by default.
        p.sendline('1234') # We expect see this twice from the child...
        p.expect(['1234']) # ... once from the tty echo...
        p.expect(['1234']) # ... and again from cat itself.
        p.setecho(False) # Turn off tty echo
        p.sendline('abcd') # We will set this only once (echoed by cat).
        p.sendline('wxyz') # We will set this only once (echoed by cat)
        p.expect(['abcd'])
        p.expect(['wxyz'])
        ```

        The following WILL NOT WORK because the lines sent before the setecho
        will be lost:

        ```
        p = pexpect.spawn('cat')
        p.sendline('1234')
        p.setecho(False) # Turn off tty echo
        p.sendline('abcd') # We will set this only once (echoed by cat).
        p.sendline('wxyz') # We will set this only once (echoed by cat)
        p.expect(['1234'])
        p.expect(['1234'])
        p.expect(['abcd'])
        p.expect(['wxyz'])
        ```

        Not supported on platforms where `isatty()` returns False.

    `waitnoecho`(*timeout=-1*)[[source]](../_modules/pexpect/pty_spawn.html#spawn.waitnoecho)[¶](#pexpect.spawn.waitnoecho "Permalink to this definition")
    :   This waits until the terminal ECHO flag is set False. This returns
        True if the echo mode is off. This returns False if the ECHO flag was
        not set False before the timeout. This can be used to detect when the
        child is waiting for a password. Usually a child application will turn
        off echo mode when it is waiting for the user to enter a password. For
        example, instead of expecting the “password:” prompt you can wait for
        the child to set ECHO off:

        ```
        p = pexpect.spawn('ssh user@example.com')
        p.waitnoecho()
        p.sendline(mypassword)
        ```

        If timeout==-1 then this method will use the value in self.timeout.
        If timeout==None then this method to block until ECHO flag is False.

    `pid`[¶](#pexpect.spawn.pid "Permalink to this definition")
    :   The process ID of the child process.

    `child_fd`[¶](#pexpect.spawn.child_fd "Permalink to this definition")
    :   The file descriptor used to communicate with the child process.

### Handling unicode[¶](#handling-unicode "Permalink to this headline")

By default, [`spawn`](#pexpect.spawn "pexpect.spawn") is a bytes interface: its read methods return bytes,
and its write/send and expect methods expect bytes. If you pass the *encoding*
parameter to the constructor, it will instead act as a unicode interface:
strings you send will be encoded using that encoding, and bytes received will
be decoded before returning them to you. In this mode, patterns for
[`expect()`](#pexpect.spawn.expect "pexpect.spawn.expect") and [`expect_exact()`](#pexpect.spawn.expect_exact "pexpect.spawn.expect_exact") should also be unicode.

Changed in version 4.0: [`spawn`](#pexpect.spawn "pexpect.spawn") provides both the bytes and unicode interfaces. In Pexpect
3.x, the unicode interface was provided by a separate `spawnu` class.

For backwards compatibility, some Unicode is allowed in bytes mode: the
send methods will encode arbitrary unicode as UTF-8 before sending it to the
child process, and its expect methods can accept ascii-only unicode strings.

Note

Unicode handling with pexpect works the same way on Python 2 and 3, despite
the difference in names. I.e.:

* Bytes mode works with `str` on Python 2, and [`bytes`](https://docs.python.org/3/library/stdtypes.html#bytes "(in Python v3.8)") on Python 3,
* Unicode mode works with `unicode` on Python 2, and [`str`](https://docs.python.org/3/library/stdtypes.html#str "(in Python v3.8)") on Python 3.

## run function[¶](#run-function "Permalink to this headline")

`pexpect.``run`(*command*, *timeout=30*, *withexitstatus=False*, *events=None*, *extra\_args=None*, *logfile=None*, *cwd=None*, *env=None*, *\*\*kwargs*)[[source]](../_modules/pexpect/run.html#run)[¶](#pexpect.run "Permalink to this definition")
:   This function runs the given command; waits for it to finish; then
    returns all output as a string. STDERR is included in output. If the full
    path to the command is not given then the path is searched.

    Note that lines are terminated by CR/LF (rn) combination even on
    UNIX-like systems because this is the standard for pseudottys. If you set
    ‘withexitstatus’ to true, then run will return a tuple of (command\_output,
    exitstatus). If ‘withexitstatus’ is false then this returns just
    command\_output.

    The run() function can often be used instead of creating a spawn instance.
    For example, the following code uses spawn:

    ```
    from pexpect import *
    child = spawn('scp foo user@example.com:.')
    child.expect('(?i)password')
    child.sendline(mypassword)
    ```

    The previous code can be replace with the following:

    ```
    from pexpect import *
    run('scp foo user@example.com:.', events={'(?i)password': mypassword})
    ```

    **Examples**

    Start the apache daemon on the local machine:

    ```
    from pexpect import *
    run("/usr/local/apache/bin/apachectl start")
    ```

    Check in a file using SVN:

    ```
    from pexpect import *
    run("svn ci -m 'automatic commit' my_file.py")
    ```

    Run a command and capture exit status:

    ```
    from pexpect import *
    (command_output, exitstatus) = run('ls -l /bin', withexitstatus=1)
    ```

    The following will run SSH and execute ‘ls -l’ on the remote machine. The
    password ‘secret’ will be sent if the ‘(?i)password’ pattern is ever seen:

    ```
    run("ssh username@machine.example.com 'ls -l'",
        events={'(?i)password':'secret\n'})
    ```

    This will start mencoder to rip a video from DVD. This will also display
    progress ticks every 5 seconds as it runs. For example:

    ```
    from pexpect import *
    def print_ticks(d):
        print d['event_count'],
    run("mencoder dvd://1 -o video.avi -oac copy -ovc copy",
        events={TIMEOUT:print_ticks}, timeout=5)
    ```

    The ‘events’ argument should be either a dictionary or a tuple list that
    contains patterns and responses. Whenever one of the patterns is seen
    in the command output, run() will send the associated response string.
    So, run() in the above example can be also written as:

    > run(“mencoder dvd://1 -o video.avi -oac copy -ovc copy”,
    > :   events=[(TIMEOUT,print\_ticks)], timeout=5)

    Use a tuple list for events if the command output requires a delicate
    control over what pattern should be matched, since the tuple list is passed
    to pexpect() as its pattern list, with the order of patterns preserved.

    Note that you should put newlines in your string if Enter is necessary.

    Like the example above, the responses may also contain a callback, either
    a function or method. It should accept a dictionary value as an argument.
    The dictionary contains all the locals from the run() function, so you can
    access the child spawn object or any other variable defined in run()
    (event\_count, child, and extra\_args are the most useful). A callback may
    return True to stop the current run process. Otherwise run() continues
    until the next event. A callback may also return a string which will be
    sent to the child. ‘extra\_args’ is not used by directly run(). It provides
    a way to pass data to a callback function through run() through the locals
    dictionary passed to a callback.

    Like [`spawn`](#pexpect.spawn "pexpect.spawn"), passing *encoding* will make it work with unicode
    instead of bytes. You can pass *codec\_errors* to control how errors in
    encoding and decoding are handled.

## Exceptions[¶](#exceptions "Permalink to this headline")

*class* `pexpect.``EOF`(*value*)[[source]](../_modules/pexpect/exceptions.html#EOF)[¶](#pexpect.EOF "Permalink to this definition")
:   Raised when EOF is read from a child.
    This usually means the child has exited.

*class* `pexpect.``TIMEOUT`(*value*)[[source]](../_modules/pexpect/exceptions.html#TIMEOUT)[¶](#pexpect.TIMEOUT "Permalink to this definition")
:   Raised when a read time exceeds the timeout.

*class* `pexpect.``ExceptionPexpect`(*value*)[[source]](../_modules/pexpect/exceptions.html#ExceptionPexpect)[¶](#pexpect.ExceptionPexpect "Permalink to this definition")
:   Base class for all exceptions raised by this module.

## Utility functions[¶](#utility-functions "Permalink to this headline")

`pexpect.``which`(*filename*, *env=None*)[[source]](../_modules/pexpect/utils.html#which)[¶](#pexpect.which "Permalink to this definition")
:   This takes a given filename; tries to find it in the environment path;
    then checks if it is executable. This returns the full path to the filename
    if found and executable. Otherwise this returns None.

`pexpect.``split_command_line`(*command\_line*)[[source]](../_modules/pexpect/utils.html#split_command_line)[¶](#pexpect.split_command_line "Permalink to this definition")
:   This splits a command line into a list of arguments. It splits arguments
    on spaces, but handles embedded quotes, doublequotes, and escaped
    characters. It’s impossible to do this with a regular expression, so I
    wrote a little state machine to parse the command line.

[Next](fdpexpect.html "fdpexpect - use pexpect with a file descriptor")
 [Previous](index.html "API documentation")

---

© Copyright 2013, Noah Spurrier and contributors
Revision `5eed1a31`.

Built with [Sphinx](http://sphinx-doc.org/) using a [theme](https://github.com/rtfd/sphinx_rtd_theme) provided by [Read the Docs](https://readthedocs.org).
