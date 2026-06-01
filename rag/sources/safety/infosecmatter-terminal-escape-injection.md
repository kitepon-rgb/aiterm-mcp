---
title: "Terminal Escape Injection"
source_url: "https://www.infosecmatter.com/terminal-escape-injection/"
source_type: article
fetched: 2026-06-01
topic: safety
tags: ["escape-injection", "cursor-manipulation", "visual-deception", "ace", "cat", "scripts"]
summary: "カーソル上移動(例 ESC[2A)で表示上のコマンドを上書きし、無害に見せかけて別コマンドを実行させる視覚的欺瞞の解説。shell/Python/PowerShell等の実例付き。"
relevance: "「画面を読んで完了を判断」する我々の層が、カーソル移動で改変された表示に騙されうることを示す。quiescence判定や画面解釈で生のエスケープを信用しない設計を裏付ける。"
chars: 36659
---

[Skip to content](#content)

[![InfosecMatter.com logo](https://www.infosecmatter.com/wp-content/uploads/2021/04/infosecmatter-logo.jpg)](https://www.infosecmatter.com/)

Main Menu

* [Vulnerability Assessment](https://www.infosecmatter.com/vulnerability-assessment/)
  + [Top 20 Microsoft Azure Vulnerabilities and Misconfigurations](https://www.infosecmatter.com/top-20-microsoft-azure-vulnerabilities-and-misconfigurations/)
  + [CMS Vulnerability Scanners for WordPress, Joomla, Drupal, Moodle, Typo3..](https://www.infosecmatter.com/cms-vulnerability-scanners-for-wordpress-joomla-drupal-moodle-typo3/)
  + [Nessus Plugin Library](https://www.infosecmatter.com/nessus-plugin-library/)
  + [Detailed Overview of Nessus Professional](https://www.infosecmatter.com/detailed-overview-of-nessus-professional/)
  + [Install Nessus and Plugins Offline (with pictures)](https://www.infosecmatter.com/install-nessus-and-plugins-offline-tutorial-with-pictures/)
* [Penetration Testing](https://www.infosecmatter.com/penetration-testing/)
  + [Top 10 Vulnerabilities: Internal Infrastructure Pentest](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)
  + [Top 16 Active Directory Vulnerabilities](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)
  + [19 Ways to Bypass Software Restrictions and Spawn a Shell](https://www.infosecmatter.com/19-ways-to-bypass-software-restrictions-and-spawn-a-shell/)
  + [Empire Module Library](https://www.infosecmatter.com/empire-module-library/)
  + [CrackMapExec Module Library](https://www.infosecmatter.com/crackmapexec-module-library/)
  + [Accessing Windows Systems Remotely From Linux](https://www.infosecmatter.com/accessing-windows-systems-remotely-from-linux/)
    - [RCE on Windows from Linux Part 1: Impacket](https://www.infosecmatter.com/rce-on-windows-from-linux-part-1-impacket/)
    - [RCE on Windows from Linux Part 2: CrackMapExec](https://www.infosecmatter.com/rce-on-windows-from-linux-part-2-crackmapexec/)
    - [RCE on Windows from Linux Part 3: Pass-The-Hash Toolkit](https://www.infosecmatter.com/rce-on-windows-from-linux-part-3-pth-toolkit/)
    - [RCE on Windows from Linux Part 4: Keimpx](https://www.infosecmatter.com/rce-on-windows-from-linux-part-4-keimpx/)
    - [RCE on Windows from Linux Part 5: Metasploit Framework](https://www.infosecmatter.com/rce-on-windows-from-linux-part-5-metasploit-framework/)
    - [RCE on Windows from Linux Part 6: RedSnarf](https://www.infosecmatter.com/rce-on-windows-from-linux-part-6-redsnarf/)
  + [Cisco Password Cracking and Decrypting Guide](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)
  + [PowerShell Commands for Pentesters](https://www.infosecmatter.com/powershell-commands-for-pentesters/)
  + [Pure PowerShell Infosec Cheatsheet](https://www.infosecmatter.com/pure-powershell-infosec-cheatsheet/)
  + [Reveal Passwords from Administrative Interfaces](https://www.infosecmatter.com/reveal-passwords-from-administrative-interfaces/)
  + [Firebird Database Exploitation](https://www.infosecmatter.com/firebird-database-exploitation/)
  + [Top 25 Penetration Testing Skills and Competencies (Detailed)](https://www.infosecmatter.com/top-25-penetration-testing-skills-and-competencies-detailed/)
  + [Where To Learn Ethical Hacking & Penetration Testing](https://www.infosecmatter.com/where-to-learn-ethical-hacking-and-penetration-testing/)
  + [Exploits, Vulnerabilities and Payloads: Practical Introduction](https://www.infosecmatter.com/exploits-vulnerabilities-and-payloads-practical-introduction/)
  + [Solving Problems with Office 365 Email from GoDaddy](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)
  + [Terminal Escape Injection](https://www.infosecmatter.com/terminal-escape-injection/)
* [Network Security](https://www.infosecmatter.com/network-security/)
  + [Capture Passwords using Wireshark](https://www.infosecmatter.com/capture-passwords-using-wireshark/)
  + [Detecting Network Attacks with Wireshark](https://www.infosecmatter.com/detecting-network-attacks-with-wireshark/)
  + [How to Port Scan a Website](https://www.infosecmatter.com/how-to-port-scan-a-website/)
  + [Nmap NSE Library](https://www.infosecmatter.com/nmap-nse-library/)
  + [SSH Sniffing (SSH Spying) Methods and Defense](https://www.infosecmatter.com/ssh-sniffing-ssh-spying-methods-and-defense/)
  + [Security Operations Center: Challenges of SOC Teams](https://www.infosecmatter.com/security-operations-center-challenges-of-soc-teams/)
  + [Spaces in Passwords – Good or a Bad Idea?](https://www.infosecmatter.com/spaces-in-passwords-good-or-a-bad-idea/)
  + [Why Does Nmap Need Root Privileges?](https://www.infosecmatter.com/why-does-nmap-need-root-privileges/)
  + [Solution for SSH Unable to Negotiate Errors](https://www.infosecmatter.com/solution-for-ssh-unable-to-negotiate-errors/)
  + [The Onion Router and Privacy](https://www.infosecmatter.com/the-onion-router-and-privacy/)
* [Bug Hunting](https://www.infosecmatter.com/bug-bounty-tips/)
  + [Bug Bounty Tips](https://www.infosecmatter.com/./bug-bounty-tips/)
    - [Bug Bounty Tips #1](https://www.infosecmatter.com/bug-bounty-tips-1/)
    - [Bug Bounty Tips #2](https://www.infosecmatter.com/bug-bounty-tips-2-jun-30/)
    - [Bug Bounty Tips #3](https://www.infosecmatter.com/bug-bounty-tips-3-jul-21/)
    - [Bug Bounty Tips #4](https://www.infosecmatter.com/bug-bounty-tips-4-aug-03/)
    - [Bug Bounty Tips #5](https://www.infosecmatter.com/bug-bounty-tips-5-aug-17/)
    - [Bug Bounty Tips #6](https://www.infosecmatter.com/bug-bounty-tips-6-sep-07/)
    - [Bug Bounty Tips #7](https://www.infosecmatter.com/bug-bounty-tips-7-sep-27/)
    - [Bug Bounty Tips #8](https://www.infosecmatter.com/bug-bounty-tips-8-oct-14/)
    - [Bug Bounty Tips #9](https://www.infosecmatter.com/bug-bounty-tips-9-nov-16/)
    - [Bug Bounty Tips #10](https://www.infosecmatter.com/bug-bounty-tips-10-dec-24/)
  + [Become a Penetration Tester vs. Bug Bounty Hunter?](https://www.infosecmatter.com/become-a-penetration-tester-vs-bug-bounty-hunter/)
* [Tools](https://www.infosecmatter.com/tools/)
  + [Port Scanner in PowerShell (TCP/UDP)](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)
  + [Active Directory Brute Force Attack Tool in PowerShell (ADLogin.ps1)](https://www.infosecmatter.com/active-directory-brute-force-attack-tool-in-powershell-adlogin-ps1/)
  + [Windows Local Admin Brute Force Attack Tool (LocalBrute.ps1)](https://www.infosecmatter.com/windows-local-admin-brute-force-attack-tool-localbrute-ps1/)
  + [SMB Brute Force Attack Tool in PowerShell (SMBLogin.ps1)](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)
  + [SSH Brute Force Attack Tool using PuTTY / Plink (ssh-putty-brute.ps1)](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)
  + [Default Password Scanner (default-http-login-hunter.sh)](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)
  + [Nessus CSV Parser and Extractor (yanp.sh)](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)
* [Metasploit](https://www.infosecmatter.com/metasploit-module-library/)
  + [Metasploit Module Library](https://www.infosecmatter.com/metasploit-module-library/)
  + [Linux Exploits](https://www.infosecmatter.com/list-of-metasploit-linux-exploits-detailed-spreadsheet/)
  + [Windows Exploits](https://www.infosecmatter.com/list-of-metasploit-windows-exploits-detailed-spreadsheet/)
  + [Payloads](https://www.infosecmatter.com/list-of-metasploit-payloads-detailed-spreadsheet/)
  + [Auxiliary Modules](https://www.infosecmatter.com/metasploit-auxiliary-modules-detailed-spreadsheet/)
  + [Post Exploitation Modules](https://www.infosecmatter.com/post-exploitation-metasploit-modules-reference/)
  + [Android Modules](https://www.infosecmatter.com/metasploit-android-modules/)
  + [Why your exploit completed, but no session was created?](https://www.infosecmatter.com/why-your-exploit-completed-but-no-session-was-created-try-these-fixes/)
  + [Why is your Meterpreter session dying?](https://www.infosecmatter.com/why-is-your-meterpreter-session-dying-try-these-fixes/)
* [Glossary](https://www.infosecmatter.com/infosec-glossary/)
* [Contact](https://www.infosecmatter.com/contact/)
* [Support](https://www.infosecmatter.com/donate/)

# Terminal Escape Injection

2020-04-16

![Terminal escape injection logo](https://www.infosecmatter.com/wp-content/uploads/2020/04/terminal-escape-injection-logo.png)

As information security professionals, we have to deal with potentially dangerous files practically on daily basis. We run various scripts, PoC code, exploits and other things and we put trust in the utilities that read those files. Can we really trust them? In this article we will have a peak into the world of ANSI/VT escape sequences.

Table Of Contents

show

* [What are the escape sequences?](#what-are-the-escape-sequences)
* [But wait, I’m safe on Windows!](#but-wait-im-safe-on-windows)
* [So what is going on here?](#so-what-is-going-on-here)
* [Ok, so what’s the potential impact?](#ok-so-whats-the-potential-impact)
* [Where can we find escape injections?](#where-can-we-find-escape-injections)
* [So how safe is it to cat an arbitrary file?](#so-how-safe-is-it-to-cat-an-arbitrary-file)
* [How escape injection works?](#how-escape-injection-works)
* [How to avoid escape sequence attacks in terminals?](#how-to-avoid-escape-sequence-attacks-in-terminals)

+ [UNIX/Linux](#unixlinux)
+ [Windows](#windows)

* [Test it for yourself](#test-it-for-yourself)

+ [Shell script escape injection](#shell-script-escape-injection)
+ [Python script escape injection](#python-script-escape-injection)
+ [Batch (Command Prompt) escape injection](#batch-command-prompt-escape-injection)
+ [PS1 (PowerShell) escape injection](#ps1-powershell-escape-injection)

* [Conclusion](#conclusion)
* [References](#references)

## What are the escape sequences?

Quoiting from a relevant mailing list [memo](https://www.openwall.com/lists/oss-security/2015/09/17/5) by Federico Bento:

> A terminal escape sequence is a special sequence of characters that is printed (like any other text). But, if the terminal understands the sequence, it won’t display the character-sequence, but will perform some action.

Escape sequences can do all sorts of things. Besides of changing color of the text, making it bold or making our cursor blink, they can also:

* Move cursor in any direction or to any position
* Delete or erase arbitrary text
* Perform various screen manipulations
* Even re-map keys on our keyboard!

In short, escape sequences can adversely change the way how we see things on the terminal.

And it can have really bad consequences:

![Escape sequence injection in shell script on Linux](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-shell-linux-gnome-terminal.png)

And it works everywhere and with anything! For instance, here’s an example of escape injection in a Python script on Mac OS:

![Escape sequence injection in Python script on Mac OS](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-python-mac-terminal.png)

## But wait, I’m safe on Windows!

Unfortunately, you’re not. Since Windows 10 the [Windows Terminal](https://en.wikipedia.org/wiki/Windows_Terminal) emulator also supports ANSI/VT escape sequences. And it is used by both the Command Prompt as well as the PowerShell!

So, this also works on Windows..

![Escape sequence injection in batch script on Windows](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-bat-win-cmd.png)
![Escape sequence injection in PowerShell script on Windows](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-ps1-win-powershell.png)

## So what is going on here?

Welcome to the world of terminal escape injections, or as some folks have called it in the past – [The new XSS for Linux sysadmins](https://ma.ttias.be/terminal-escape-sequences-the-new-xss-for-linux-sysadmins/).

We now know that it’s not just a Linux thing – it affects every platform that uses VT/ANSI compatible terminal.

And it’s nothing new. Terminals have been with us since the dawn of computers.

There are many different terminal emulators out there and each of them can have [specific](http://ascii-table.com/ansi-escape-sequences-vt-100.php) [escape](https://www.iterm2.com/documentation-escape-codes.html) [sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html) on top the common [ANSI/VT](http://ascii-table.com/ansi-escape-sequences.php) ones.

When these escape sequences are used in a malicious way (with a malicious intent), it’s called terminal escape injection.

## Ok, so what’s the potential impact?

The consequences of falling for this trick could be obviously very serious. Disastrous, if we are running as root / Administrator.

Basically we could be fooled into executing arbitrary code (ACE) on our system and completely compromising ourselves. For instance, an attacker could:

* Install backdoor (RAT) on our system
* Plant malware or rootkit on our system
* Capture keystrokes and record our screen
* Practically anything you can imagine really

On top of it, there has been [many](https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=terminal+escape) different vulnerabilities reported throughout the years attributed to escape injections.

## Where can we find escape injections?

Apart from planting them into various scripts, they could be also successfully planted into:

* Configuration files – potentially with the same impact (ACE)
* Log files – as part of detection bypass efforts

## So how safe is it to cat an arbitrary file?

As we have already seen, it is not safe at all. But the same can be said about the get-content command in Powershell, or the type command in the Command Prompt.

The problem with these things is that they do not sanitize the output in any way. They merely print out whatever content is there. They don’t care.

So if there is some binary content, they will just print it out and we will see some gibberish.

And if there happens to be some particular byte sequence that the ANSI/VT terminal understands as an escape sequence, then the terminal will simply interpret it.

So this is not really a bug. That’s just how things are with console applications. And as cyber security professionals, we should be vigilant about the risks.

## How escape injection works?

Let’s consider the following shell script with visibly displayed escape injection:

![Escape sequence injection sanitized](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-solution.png)

Now suppose we didn’t use the -v parameter. As the cat command is displaying the content of the script line by line, the escape sequence (`^[[2A`) will move the cursor 2 lines up – back on the position where the evil code is. And then the code will be rewritten by our benign (Hello World) code.

Note that this is just for demonstration purposes. The escape sequences are powerful enough so that we don’t need to use any benign or fake code. We could simply make the malicious lines disappear, if we wanted to.

## How to avoid escape sequence attacks in terminals?

Here’s an actionable advice on how we can protect ourselves from escape injections:

### UNIX/Linux

**1**. On UNIX based systems, beware of the utilities that output raw data. This includes:

* cat, head, tail, more
* curl, wget
* diff

Do not believe their output without thoroughly inspecting it, when it matters.

**2**. Use cat -v to display non-printable characters or use the less command.

For instance, we should never install software from the Internet just by using curl / wget and piping it into shell. Visual analysis is not enough:

![Insecure installation of software from the Internet using curl](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-insecure-install-with-curl.png)

We should always inspect it using cat -v or using the less command to see if there is something fishy going on:

![Inspect installation script before installing using cat -v](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-inject-insecure-install-with-curl-inspect-with-cat-v.png)

We can clearly see the nastiness there.

**3**. We can also use text editors such as nano, pico, vim, emacs or any other editor that we prefer.

### Windows

**1**. In Command Prompt we can use the more command instead of the type command. The more command will reveal the escape sequences:

![More command mitigating escape injection in Command Prompt](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-injects-solution-cmd.png)

But it doesn’t work in PowerShell.

**2**. In PowerShell it seems there is no way to sanitize the escape sequences by using some parameter or some other function instead of using the get-content command.

I was only able to come up with the following somewhat clumsy and complicated solutions to reveal the hidden terminal injections:

Solution 1:

```
gc <file> -encoding Byte | % { [char]$_+" " | write-host -nonewline }
```

Solution 2:

```
gc <file> -encoding Byte | % { if ( $_ -lt 32 -or $_ -gt 126 ) { [char]$_+" " } else { [char]$_ } } | write-host -nonewline
```

![PowerShell snippets to reveal escape injection attacks](https://www.infosecmatter.com/wp-content/uploads/2020/04/esc-injects-solution-powershell.png)

They both work and will reveal the hidden escape injections.

**3**. Best solution on Windows is to always use text editors such as Notepad or WordPad. Do not rely on console utilities.

## Test it for yourself

The following snippets provide instructions on how to generate all the examples shown in this article.

You can also find them in my dedicated GitHub repository:

* <https://github.com/InfosecMatter/terminal-escape-injections>

### Shell script escape injection

`echo -e '#!/bin/sh\n\necho "evil!"\nexit 0\n\033[2Aecho "Hello World!"\n' > script.sh
chmod a+x script.sh`

The resulting script.sh will then work on (has been tested on):

* Linux (gnome-terminal, xterm, aterm)
* Mac OS (Terminal 2.0, iTerm2)
* Cygwin (Windows)

### Python script escape injection

`echo -e '#!/usr/bin/python\n\nprint "evil!";\nexit(0);\n#\033[2A\033[1Dprint "Hello World!";\n' > script.py

chmod a+x script.py`

The resulting script.py will then work on (has been tested on):

* Linux (gnome-terminal, xterm, aterm)
* Mac OS (Terminal 2.0, iTerm2)
* Cygwin (Windows)

### Batch (Command Prompt) escape injection

`echo -e '@echo off\n\r\n\recho evil!\r\n::\033[2D  \033[A\033[2Decho Hello World!' > script.bat`

The resulting script.bat will then work on (has been tested on):

* Windows 10 PowerShell
* Windows 10 Command Prompt

### PS1 (PowerShell) escape injection

`echo -e 'write-host "evil!"\r\n#\033[A\033[2Dwrite-host "Hello World!"' > script.ps1`

The resulting script.ps1 will then work on (has been tested on):

* Windows 10 PowerShell
* Windows 10 Command Prompt

## Conclusion

As we have seen in this article, terminal escape injections affect practically every modern operating system environment and they can be really nasty.

As cyber security professionals, we should know about them and keep our guards up when it matters. Hopefully this article provided enough information to stay safe.

Please feel free to let us know in the comment section your thoughts.

## References

* <https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=terminal+escape>
* <https://www.openwall.com/lists/oss-security/2015/09/17/5>
* <https://en.wikipedia.org/wiki/ANSI_escape_code>
* <https://www.iterm2.com/documentation-escape-codes.html>

**SHARE THIS**

![](https://www.infosecmatter.com/wp-content/uploads/2020/01/twitter.jpg)

![](https://www.infosecmatter.com/wp-content/uploads/2020/01/linkedin.jpg)

![](https://www.infosecmatter.com/wp-content/uploads/2020/01/facebook.jpg)

![](https://www.infosecmatter.com/wp-content/uploads/2020/01/pinterest.jpg)

**TAGS** | [Command Prompt](https://www.infosecmatter.com/tag/command-prompt/) | [Deception](https://www.infosecmatter.com/tag/deception/) | [Injection](https://www.infosecmatter.com/tag/injection/) | [Kali Linux](https://www.infosecmatter.com/tag/kali-linux/) | [Linux](https://www.infosecmatter.com/tag/linux/) | [Mac OS](https://www.infosecmatter.com/tag/mac-os/) | [PowerShell](https://www.infosecmatter.com/tag/powershell/) | [Safety](https://www.infosecmatter.com/tag/safety/) | [Shell](https://www.infosecmatter.com/tag/shell/) | [Windows](https://www.infosecmatter.com/tag/windows/)

**RECENT POSTS**

---

[![Nessus Plugin Library logo](https://www.infosecmatter.com/wp-content/uploads/2022/01/nessus-plugin-library-logo-150x150.jpg)](https://www.infosecmatter.com/nessus-plugin-library/)

#### [Nessus Plugin Library](https://www.infosecmatter.com/nessus-plugin-library/)

[Read More](https://www.infosecmatter.com/nessus-plugin-library/)

[![How to Gophish with Office 365 Email from GoDaddy logo](https://www.infosecmatter.com/wp-content/uploads/2021/11/How-to-Gophish-with-Office-365-Email-from-GoDaddy-150x150.jpg)](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)

#### [Solving Problems with Office 365 Email from GoDaddy](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)

[Read More](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)

[![Empire Module Library logo](https://www.infosecmatter.com/wp-content/uploads/2021/10/empire-module-library-logo-150x150.png)](https://www.infosecmatter.com/empire-module-library/)

#### [Empire Module Library](https://www.infosecmatter.com/empire-module-library/)

[Read More](https://www.infosecmatter.com/empire-module-library/)

[![CrackMapExec Module Library logo](https://www.infosecmatter.com/wp-content/uploads/2021/07/crackmapexec-module-library-150x150.jpg)](https://www.infosecmatter.com/crackmapexec-module-library/)

#### [CrackMapExec Module Library](https://www.infosecmatter.com/crackmapexec-module-library/)

[Read More](https://www.infosecmatter.com/crackmapexec-module-library/)

[![Metasploit Android Modules logo](https://www.infosecmatter.com/wp-content/uploads/2021/06/metasploit-android-modules-150x150.png)](https://www.infosecmatter.com/metasploit-android-modules/)

#### [Metasploit Android Modules](https://www.infosecmatter.com/metasploit-android-modules/)

[Read More](https://www.infosecmatter.com/metasploit-android-modules/)

**MOST VIEWED POSTS**

---

[![Active Directory vulnerabilities logo](https://www.infosecmatter.com/wp-content/uploads/2020/07/active-directory-vulnerabilities-logo-150x150.jpg)](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)

#### [Top 16 Active Directory Vulnerabilities](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)

[Read More](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)

[![Top 10 vulnerabilities found during internal network penetration tests logo](https://www.infosecmatter.com/wp-content/uploads/2020/06/top-10-vulnerabilities-found-during-internal-network-pentests-150x150.jpg)](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)

#### [Top 10 Vulnerabilities: Internal Infrastructure Pentest](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)

[Read More](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)

[![Terminal escape injection logo](https://www.infosecmatter.com/wp-content/uploads/2020/04/terminal-escape-injection-logo-150x150.png)](https://www.infosecmatter.com/terminal-escape-injection/)

#### [Terminal Escape Injection](https://www.infosecmatter.com/terminal-escape-injection/)

[Read More](https://www.infosecmatter.com/terminal-escape-injection/)

[![Cisco password cracking and decrypting guide](https://www.infosecmatter.com/wp-content/uploads/2020/03/cisco-password-cracking-and-decrypting-guide-150x150.jpg)](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)

#### [Cisco Password Cracking and Decrypting Guide](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)

[Read More](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)

[![Capturing passwords with Wireshark](https://www.infosecmatter.com/wp-content/uploads/2020/01/capturing-passwords-with-wireshark-150x150.jpg)](https://www.infosecmatter.com/capture-passwords-using-wireshark/)

#### [Capture Passwords using Wireshark](https://www.infosecmatter.com/capture-passwords-using-wireshark/)

[Read More](https://www.infosecmatter.com/capture-passwords-using-wireshark/)

**MOST VIEWED TOOLS**

---

[![Minimalistic TCP and UDP portscanner logo](https://www.infosecmatter.com/wp-content/uploads/2020/06/minimalistic-port-scanner-logo-150x150.jpg)](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)

#### [Port Scanner in PowerShell (TCP/UDP)](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)

[Read More](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)

[![SMB login attack and password spraying using smblogin.ps1 (logo)](https://www.infosecmatter.com/wp-content/uploads/2020/05/minimalistic-smb-login-bruteforcer-logo-150x150.jpg)](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)

#### [SMB Brute Force Attack Tool in PowerShell (SMBLogin.ps1)](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)

[Read More](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)

[![SSH PuTTY login bruteforce logo](https://www.infosecmatter.com/wp-content/uploads/2020/04/ssh-putty-brute-150x150.jpg)](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)

#### [SSH Brute Force Attack Tool using PuTTY / Plink (ssh-putty-brute.ps1)](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)

[Read More](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)

[![Hunter of Default Logins (Web/HTTP)](https://www.infosecmatter.com/wp-content/uploads/2020/04/http-default-login-scanner-150x150.jpg)](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)

#### [Default Password Scanner (default-http-login-hunter.sh)](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)

[Read More](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)

[![yenp - Nessus CSV parser and extractor](https://www.infosecmatter.com/wp-content/uploads/2020/03/yenp-nessus-csv-parser-and-extractor-150x150.jpg)](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)

#### [Nessus CSV Parser and Extractor](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)

[Read More](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)

---

[← Previous Post](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/ "Default Password Scanner (default-http-login-hunter.sh)")

[Next Post →](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/ "SSH Brute Force Attack Tool using PuTTY / Plink (ssh-putty-brute.ps1)")

### Leave a Comment [Cancel Reply](/terminal-escape-injection/#respond)

Your email address will not be published. Required fields are marked \*

Type here..

Name\*

Email\*

Website

[ ]  Save my name, email, and website in this browser for the next time I comment.

**SEARCH THIS SITE**

Search for:

**FOLLOW US**
[Github](https://github.com/InfosecMatter) | [Twitter](https://twitter.com/InfosecMatter) | [Facebook](https://www.facebook.com/infosecmattercom/)
Enter your email address:

Please leave this field empty.![Loading](https://www.infosecmatter.com/wp-content/plugins/email-subscribers/lite/public/images/spinner.gif)

**CATEGORIES**

---

## Categories

* [Bug Bounty Tips](https://www.infosecmatter.com/./bug-bounty-tips/) (10)
* [Exploitation](https://www.infosecmatter.com/./exploitation/) (13)
* [Network Security](https://www.infosecmatter.com/./network-security/) (8)
* [Penetration Testing](https://www.infosecmatter.com/./penetration-testing/) (42)
* [Tools and Utilities](https://www.infosecmatter.com/./tools/) (9)
* [Vulnerability Assessment](https://www.infosecmatter.com/./vulnerability-assessment/) (8)

**ARCHIVES**

---

## Archives

* [January 2022](https://www.infosecmatter.com/2022/01/) (1)
* [November 2021](https://www.infosecmatter.com/2021/11/) (1)
* [October 2021](https://www.infosecmatter.com/2021/10/) (1)
* [July 2021](https://www.infosecmatter.com/2021/07/) (1)
* [June 2021](https://www.infosecmatter.com/2021/06/) (1)
* [May 2021](https://www.infosecmatter.com/2021/05/) (5)
* [April 2021](https://www.infosecmatter.com/2021/04/) (6)
* [December 2020](https://www.infosecmatter.com/2020/12/) (3)
* [November 2020](https://www.infosecmatter.com/2020/11/) (3)
* [October 2020](https://www.infosecmatter.com/2020/10/) (3)
* [September 2020](https://www.infosecmatter.com/2020/09/) (3)
* [August 2020](https://www.infosecmatter.com/2020/08/) (4)
* [July 2020](https://www.infosecmatter.com/2020/07/) (4)
* [June 2020](https://www.infosecmatter.com/2020/06/) (6)
* [May 2020](https://www.infosecmatter.com/2020/05/) (6)
* [April 2020](https://www.infosecmatter.com/2020/04/) (4)
* [March 2020](https://www.infosecmatter.com/2020/03/) (4)
* [February 2020](https://www.infosecmatter.com/2020/02/) (7)
* [January 2020](https://www.infosecmatter.com/2020/01/) (1)

---

**RECENT POSTS**

---

[![Nessus Plugin Library logo](https://www.infosecmatter.com/wp-content/uploads/2022/01/nessus-plugin-library-logo-300x200.jpg)](https://www.infosecmatter.com/nessus-plugin-library/)

#### [Nessus Plugin Library](https://www.infosecmatter.com/nessus-plugin-library/)

[Read More](https://www.infosecmatter.com/nessus-plugin-library/)

[![How to Gophish with Office 365 Email from GoDaddy logo](https://www.infosecmatter.com/wp-content/uploads/2021/11/How-to-Gophish-with-Office-365-Email-from-GoDaddy-300x200.jpg)](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)

#### [Solving Problems with Office 365 Email from GoDaddy](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)

[Read More](https://www.infosecmatter.com/solving-problems-with-office-365-email-from-godaddy/)

[![Empire Module Library logo](https://www.infosecmatter.com/wp-content/uploads/2021/10/empire-module-library-logo-300x200.png)](https://www.infosecmatter.com/empire-module-library/)

#### [Empire Module Library](https://www.infosecmatter.com/empire-module-library/)

[Read More](https://www.infosecmatter.com/empire-module-library/)

[![CrackMapExec Module Library logo](https://www.infosecmatter.com/wp-content/uploads/2021/07/crackmapexec-module-library-300x200.jpg)](https://www.infosecmatter.com/crackmapexec-module-library/)

#### [CrackMapExec Module Library](https://www.infosecmatter.com/crackmapexec-module-library/)

[Read More](https://www.infosecmatter.com/crackmapexec-module-library/)

[![Metasploit Android Modules logo](https://www.infosecmatter.com/wp-content/uploads/2021/06/metasploit-android-modules-300x200.png)](https://www.infosecmatter.com/metasploit-android-modules/)

#### [Metasploit Android Modules](https://www.infosecmatter.com/metasploit-android-modules/)

[Read More](https://www.infosecmatter.com/metasploit-android-modules/)

**MOST VIEWED POSTS**

---

[![Active Directory vulnerabilities logo](https://www.infosecmatter.com/wp-content/uploads/2020/07/active-directory-vulnerabilities-logo-300x200.jpg)](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)

#### [Top 16 Active Directory Vulnerabilities](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)

[Read More](https://www.infosecmatter.com/top-16-active-directory-vulnerabilities/)

[![Top 10 vulnerabilities found during internal network penetration tests logo](https://www.infosecmatter.com/wp-content/uploads/2020/06/top-10-vulnerabilities-found-during-internal-network-pentests-300x200.jpg)](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)

#### [Top 10 Vulnerabilities: Internal Infrastructure Pentest](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)

[Read More](https://www.infosecmatter.com/top-10-vulnerabilities-internal-infrastructure-pentest/)

[![Terminal escape injection logo](https://www.infosecmatter.com/wp-content/uploads/2020/04/terminal-escape-injection-logo-300x202.png)](https://www.infosecmatter.com/terminal-escape-injection/)

#### [Terminal Escape Injection](https://www.infosecmatter.com/terminal-escape-injection/)

[Read More](https://www.infosecmatter.com/terminal-escape-injection/)

[![Cisco password cracking and decrypting guide](https://www.infosecmatter.com/wp-content/uploads/2020/03/cisco-password-cracking-and-decrypting-guide-300x210.jpg)](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)

#### [Cisco Password Cracking and Decrypting Guide](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)

[Read More](https://www.infosecmatter.com/cisco-password-cracking-and-decrypting-guide/)

[![Capturing passwords with Wireshark](https://www.infosecmatter.com/wp-content/uploads/2020/01/capturing-passwords-with-wireshark-300x211.jpg)](https://www.infosecmatter.com/capture-passwords-using-wireshark/)

#### [Capture Passwords using Wireshark](https://www.infosecmatter.com/capture-passwords-using-wireshark/)

[Read More](https://www.infosecmatter.com/capture-passwords-using-wireshark/)

**MOST VIEWED TOOLS**

---

[![SSH PuTTY login bruteforce logo](https://www.infosecmatter.com/wp-content/uploads/2020/04/ssh-putty-brute-300x202.jpg)](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)

#### [SSH Brute Force Attack Tool using PuTTY / Plink (ssh-putty-brute.ps1)](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)

[Read More](https://www.infosecmatter.com/ssh-brute-force-attack-tool-using-putty-plink-ssh-putty-brute-ps1/)

[![SMB login attack and password spraying using smblogin.ps1 (logo)](https://www.infosecmatter.com/wp-content/uploads/2020/05/minimalistic-smb-login-bruteforcer-logo-300x206.jpg)](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)

#### [SMB Brute Force Attack Tool in PowerShell (SMBLogin.ps1)](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)

[Read More](https://www.infosecmatter.com/smb-brute-force-attack-tool-in-powershell-smblogin-ps1/)

[![Minimalistic TCP and UDP portscanner logo](https://www.infosecmatter.com/wp-content/uploads/2020/06/minimalistic-port-scanner-logo-300x203.jpg)](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)

#### [Port Scanner in PowerShell (TCP/UDP)](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)

[Read More](https://www.infosecmatter.com/port-scanner-in-powershell-tcp-udp-ps1/)

[![yenp - Nessus CSV parser and extractor](https://www.infosecmatter.com/wp-content/uploads/2020/03/yenp-nessus-csv-parser-and-extractor-300x204.jpg)](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)

#### [Nessus CSV Parser and Extractor](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)

[Read More](https://www.infosecmatter.com/nessus-csv-parser-and-extractor/)

[![Hunter of Default Logins (Web/HTTP)](https://www.infosecmatter.com/wp-content/uploads/2020/04/http-default-login-scanner-300x202.jpg)](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)

#### [Default Password Scanner (default-http-login-hunter.sh)](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)

[Read More](https://www.infosecmatter.com/default-password-scanner-default-http-login-hunter-sh/)

Copyright © 2026 [InfosecMatter](https://www.infosecmatter.com/) | [About](https://www.infosecmatter.com/about/) | [Privacy Policy](https://www.infosecmatter.com/privacy-policy/) | [Contact Us](https://www.infosecmatter.com/contact)
| [Infosec Glossary](https://www.infosecmatter.com/infosec-glossary) | [Support](https://www.infosecmatter.com/donate/) |
