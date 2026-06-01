---
title: "How Attackers Weaponize ANSI Escape Sequences"
source_url: "https://www.packetlabs.net/posts/weaponizing-ansi-escape-sequences/"
source_type: article
fetched: 2026-06-01
topic: safety
tags: ["ansi-escape", "osc8", "osc52", "dos", "log-injection", "cwe-150", "rce"]
summary: "ANSIエスケープ悪用の分類整理:ログ汚染(CWE-150)、文字大量出力によるDoS、OSC8偽ハイパーリンク、OSC52クリップボード/マウス追跡、不正ファイル転送、RCEまで。責任所在の曖昧さも論じる。"
relevance: "keystroke直送と画面読みで遭遇しうる攻撃面の体系的カタログ。どの制御カテゴリ(OSC52/OSC8/反復出力)を無害化すべきか、防御の優先順位付けに使える。"
chars: 22078
---

[Skip to main content](#main-content)

[![Packetlabs Company Logo](https://images.ctfassets.net/yewqr8zk7e5s/4Zzt787ZGserJboyLA7agx/a0780b5b4efad7e2bf5d8e2ea9a241a2/Packetlabs_logo-Balancedx2.png?q=100)](/)

* Services

  + Application Penetration Testing

    - [Application Penetration Testing Services](/services-overview/application-penetration-testing-services/)
    - [Web App Penetration Testing](/services/application-penetration-testing/)
    - [API Penetration Testing](/services/api-penetration-testing/)
    - [Mobile Penetration Testing](/services/mobile-penetration-testing/)
    - [AI/LLM Penetration Testing](/services/ai-llm-penetration-testing/)
    - [Thick Client Penetration Testing](/services/thick-client-penetration-testing/)
  + Penetration Testing

    - [Penetration Testing Services](/services-overview/penetration-testing-services/)
    - [Infrastructure Penetration Testing](/services/infrastructure-penetration-testing/)
    - [Cloud Penetration Testing](/services/cloud-penetration-testing/)
    - [IoT Penetration Testing](/services/iot-penetration-testing/)
    - [Attack Surface Penetration Testing](/services/attack-surface-penetration-testing/)
    - [Continuous Penetration Testing](/services/continuous-penetration-testing/)
  + Adversary Simulation

    - [Adversary Simulation Services](/services-overview/adversary-simulation/)
    - [Red Teaming](/services/red-teaming/)
    - [Purple Teaming](/services/purple-teaming/)
    - [Assumed Breach Penetration Testing](/services/assumed-breach-penetration-testing/)
    - [Social Engineering](/services/social-engineering/)
  + Security Assessments

    - [Security Assessments Services](/services-overview/security-assessments/)
    - [Dark Web Assessments](/services/dark-web-monitoring/)
    - [CIS Benchmark Audit](/services/benchmark-audit/)
    - [OT Cybersecurity Assessment](/services/ot-cybersecurity-assessment/)
    - [Cyber Maturity Assessment](/services/cyber-maturity-assessment/)
* How We Help

  + Cybersecurity Teams

    - [Cybersecurity Teams Overview](/cybersecurity-overview/)
    - [Validate Your Defenses](/cybersecurity/validate-your-defenses/)
    - [Secure Applications](/cybersecurity/secure-applications/)
    - [Ongoing Protection](/cybersecurity/ongoing-protection/)
    - [Core Protection](/cybersecurity/core-protection/)
    - [Test Team Readiness](/cybersecurity/test-team-readiness/)
    - [Educate Others](/cybersecurity/educate-others/)
    - [Learn About Penetration Testing](/cybersecurity/learn-about-penetration-testing/)
  + Industries

    - [Industries Overview](/industries-overview/)
    - [Education](/industries/education/)
    - [Finance](/industries/financial/)
    - [Healthcare](/industries/healthcare/)
    - [Lottery & Gaming](/industries/lottery-and-gaming/)
    - [Manufacturing](/industries/manufacturing/)
    - [Policing](/industries/policing/)
    - [Retail & Ecommerce](/industries/retail-and-ecommerce/)
    - [Tech & SaaS](/industries/technology-and-saas/)
    - [Utilities & Energy](/industries/utilities-energy/)
* Resources

  + Explore By Service

    - [Sourcing Guide](https://contact.packetlabs.net/penetration-testing-buyers-guide)
    - [Guide to Pentesting](/posts/guide-to-penetration-testing/)
    - [Guide to OT](/posts/your-guide-to-ics-ot-cybersecurity-assessments/)
    - [Guide to Cloud Testing](/posts/guide-to-cloud-penetration-testing/)
  + Explore By Reports

    - [Infrastructure Sample Report](https://contact.packetlabs.net/infrastructure-penetration-test-sample-report)
    - [Maturity Sample Report](https://contact.packetlabs.net/cyber-maturity-assessment-sample-report-download)
    - [Application Sample Report](https://contact.packetlabs.net/application-security-testing-sample-report)
    - [Cloud Sample Report](https://contact.packetlabs.net/cloud-security-penetration-testing)
  + Explore By Threats

    - [Ransomware Checklist](https://contact.packetlabs.net/ransomware-checklist)
    - [Phishing for Security](/posts/phishing-for-security/)
    - [OWASP Top 10](/posts/owasp-top-10-security/)
    - [Critical Patches](/posts/top-10-critical-security-patches/)
  + Explore By Trending

    - [Pricing Guide](/posts/penetration-testing-pricing/)
    - [Choosing a Vendor](/posts/choosing-a-penetration-testing-company/)
    - [CREST Testing](/posts/crest-certified-pentesting-services/)
    - [SOC2 Type II Testing](/posts/soc-2-attested/)
  + [View All Posts](/resources/)
* About Us

  + [About Packetlabs](/about-packetlabs/)
  + [Our Credentials](/our-credentials/)
  + [Careers](/careers/)
  + [Partner Program](/partner-program/)
  + [Media](/media/)
* [Contact](/contact-us/)

[Get a Quote](/get-quote/)

[![Packetlabs Company Logo](https://images.ctfassets.net/yewqr8zk7e5s/4Zzt787ZGserJboyLA7agx/a0780b5b4efad7e2bf5d8e2ea9a241a2/Packetlabs_logo-Balancedx2.png?q=100)](/)

* Services

  ## Application Penetration Testing

  + [Application Penetration Testing Services](/services-overview/application-penetration-testing-services/)
  + [Web App Penetration Testing](/services/application-penetration-testing/)
  + [API Penetration Testing](/services/api-penetration-testing/)
  + [Mobile Penetration Testing](/services/mobile-penetration-testing/)
  + [AI/LLM Penetration Testing](/services/ai-llm-penetration-testing/)
  + [Thick Client Penetration Testing](/services/thick-client-penetration-testing/)

  ## Penetration Testing

  + [Penetration Testing Services](/services-overview/penetration-testing-services/)
  + [Infrastructure Penetration Testing](/services/infrastructure-penetration-testing/)
  + [Cloud Penetration Testing](/services/cloud-penetration-testing/)
  + [IoT Penetration Testing](/services/iot-penetration-testing/)
  + [Attack Surface Penetration Testing](/services/attack-surface-penetration-testing/)
  + [Continuous Penetration Testing](/services/continuous-penetration-testing/)

  ## Adversary Simulation

  + [Adversary Simulation Services](/services-overview/adversary-simulation/)
  + [Red Teaming](/services/red-teaming/)
  + [Purple Teaming](/services/purple-teaming/)
  + [Assumed Breach Penetration Testing](/services/assumed-breach-penetration-testing/)
  + [Social Engineering](/services/social-engineering/)

  ## Security Assessments

  + [Security Assessments Services](/services-overview/security-assessments/)
  + [Dark Web Assessments](/services/dark-web-monitoring/)
  + [CIS Benchmark Audit](/services/benchmark-audit/)
  + [OT Cybersecurity Assessment](/services/ot-cybersecurity-assessment/)
  + [Cyber Maturity Assessment](/services/cyber-maturity-assessment/)
* How We Help

  ## Cybersecurity Teams

  + [Cybersecurity Teams Overview](/cybersecurity-overview/)
  + [Validate Your Defenses](/cybersecurity/validate-your-defenses/)
  + [Secure Applications](/cybersecurity/secure-applications/)
  + [Ongoing Protection](/cybersecurity/ongoing-protection/)
  + [Core Protection](/cybersecurity/core-protection/)
  + [Test Team Readiness](/cybersecurity/test-team-readiness/)
  + [Educate Others](/cybersecurity/educate-others/)
  + [Learn About Penetration Testing](/cybersecurity/learn-about-penetration-testing/)

  ## Industries

  + [Industries Overview](/industries-overview/)
  + [Education](/industries/education/)
  + [Finance](/industries/financial/)
  + [Healthcare](/industries/healthcare/)
  + [Lottery & Gaming](/industries/lottery-and-gaming/)
  + [Manufacturing](/industries/manufacturing/)
  + [Policing](/industries/policing/)
  + [Retail & Ecommerce](/industries/retail-and-ecommerce/)
  + [Tech & SaaS](/industries/technology-and-saas/)
  + [Utilities & Energy](/industries/utilities-energy/)
* Resources

  ## Explore By Service

  + [Sourcing Guide](https://contact.packetlabs.net/penetration-testing-buyers-guide)
  + [Guide to Pentesting](/posts/guide-to-penetration-testing/)
  + [Guide to OT](/posts/your-guide-to-ics-ot-cybersecurity-assessments/)
  + [Guide to Cloud Testing](/posts/guide-to-cloud-penetration-testing/)

  ## Explore By Reports

  + [Infrastructure Sample Report](https://contact.packetlabs.net/infrastructure-penetration-test-sample-report)
  + [Maturity Sample Report](https://contact.packetlabs.net/cyber-maturity-assessment-sample-report-download)
  + [Application Sample Report](https://contact.packetlabs.net/application-security-testing-sample-report)
  + [Cloud Sample Report](https://contact.packetlabs.net/cloud-security-penetration-testing)

  ## Explore By Threats

  + [Ransomware Checklist](https://contact.packetlabs.net/ransomware-checklist)
  + [Phishing for Security](/posts/phishing-for-security/)
  + [OWASP Top 10](/posts/owasp-top-10-security/)
  + [Critical Patches](/posts/top-10-critical-security-patches/)

  ## Explore By Trending

  + [Pricing Guide](/posts/penetration-testing-pricing/)
  + [Choosing a Vendor](/posts/choosing-a-penetration-testing-company/)
  + [CREST Testing](/posts/crest-certified-pentesting-services/)
  + [SOC2 Type II Testing](/posts/soc-2-attested/)

  [View All Posts](/resources/)
* About Us

  + [About Packetlabs](/about-packetlabs/)
  + [Our Credentials](/our-credentials/)

  + [Careers](/careers/)
  + [Partner Program](/partner-program/)

  + [Media](/media/)
* [Contact](/contact-us/)

[Get a Quote](/get-quote/)

Threats

# How Attackers Weaponize ANSI Escape Sequences

Authored By Packetlabs

Last Updated May 25, 2026|Published May 26, 2025

![How Attackers Weaponize ANSI Escape Sequences](https://images.ctfassets.net/yewqr8zk7e5s/2VV9QhkhbM3snxykKRUrvj/889ab32fed2ea55628c205c4dd951557/pexels-thisisengineering-3861976.jpg?w=1024&q=80&fm=jpg)

Using the command line terminal is a core skill for many IT professionals; terminal applications are often used for low-level system access, [remote access](https://www.packetlabs.net/posts/remote-hackers/), software configuration, package management, and more. Terminals provide access to the command shell which can often perform tasks that GUI applications aren't designed to. But while there are some obvious advantages gained from the flexibility and capability of the terminal, there are also some unique risks.

For example, in [Linux](https://www.packetlabs.net/posts/top-new-kali-linux-tools-in-2024/) and Unix systems ([including macOS](https://www.packetlabs.net/posts/2023-macos-malware-round-up/)), deleting a file via using the `**rm**` (remove) command does not place the file into the "Trash" folder. Instead, the file is permanently deleted leaving the user with no easy means for recovering it. Adversaries such as ransomware gangs also like the terminal because of its powerful and diverse capabilities. Cyber criminals use the terminal to execute built-in operating system (OS) tools in Living Off the Land (LoTL) attacks. By using built in OS features instead of custom malware hackers can more effectively avoid detection by security software.

If you have ever accidentally printed an encrypted or other binary file to the screen using a command such as `**cat`,** you may have noticed that strange things can happen such as files with strange names could appear. But wait a minute, if simply printing the contents of a file to the screen can trigger the creation of arbitrary files - what else can it do? In fact, many methods that use the terminal for [privilege escalation](https://www.packetlabs.net/posts/a-deep-dive-into-privilege-escalation/) are already well known such as [Pwnkit for Linux](https://www.packetlabs.net/posts/linux-privilege-escalation-a-look-at-pwnkit/) and even the sudo command was found to be vulnerable.

Whether you love or hate using the terminal, cyber defenders need to understand the risks. A [talk at DEFCON 31](https://www.youtube.com/watch?v=3T2Al3jdY38) (and the associated [PDF presentation](https://i.blackhat.com/BH-US-23/Presentations/US-23-stok-weponizing-plain-text-ansi-escape-sequences-as-a-forensic-nightmare-appendix.pdf)) titled *Weaponizing Plain Text ANSI Escape Sequences as a Forensic Nightmare* by STÖK introduces a fascinating in-depth analysis of persistent vulnerabilities present in many common terminal applications. Furthermore, while the full risks associated with terminal bugs are yet to be fully understood this is certainly a challenge to the cybersecurity community. Let's dive into the details.

## What Are ANSI Escape Sequences?

ANSI ([American National Standards Institute](https://www.ansi.org/)) escape sequences are special combinations of characters (two or more bytes) that are used to define specific control functions and execute them within the terminal application. These can be used for customizing the format, color, and other features on text-based terminals. ANSI escape characters can also be used to send requests to printers to automatically print documents and depending on the terminal application, can be used for more advanced features, including to execute operating system commands (OSC). Here lies their powerful potential for abuse.

The [control sequences standard](https://nicholas-morris.com/articles/ansi-codes) refers to the set of rules and specifications that define how sequences of characters, particularly escape sequences, are used to control text formatting, cursor positioning, and other terminal behaviors in text-based interfaces. This standard is commonly associated with the [ANSI X3.64](https://vt100.net/annarbor/aaa-ug/section13.html) specification, also known as the ANSI escape codes standard.

An ANSI escape sequence typically starts with an escape character (represented as `**\x1b**` or `**ESC**`) followed by a bracket (`**[**`), and then specific control codes or parameters. The specific escape character is different for each terminal application since some use Hexidecimal (Python shell), Octal (Bash), Unicode (Java, JavaScript), ASCII, Decimal (PowerShell), or potentially other character encoding standards. The general format is:

> **ESC[<parameters><command>**

## Weaponizing ANSI Control Sequences to Poison Log Files

Here is a [fast-forward to the part of STÖK's presentation](https://youtu.be/3T2Al3jdY38?si=mHMxe2W4gpWk7S8o&t=566) where he begins to discuss how ANSI escape sequences may be weaponized. STÖK's goal was to weaponize ANSI control sequences to inject malicious code into log files. This attack against log files is tracked by OWASPas Log Injection. The software weakness is categorized as [CWE-150](https://cwe.mitre.org/data/definitions/150.html)*: Improper Neutralization of Escape, Meta, or Control Sequences*. STÖK showed that under certain circumstances, Denial of Service (DoS) and Remote Code Execution (RCE) via a victim's terminal is possible.

'**OSC**' stands for **Operating System Command**, a category of ANSI escape sequences used in terminal applications that can be used to introduce an operating system command. This allows interaction with control terminal features beyond standard text output, such as setting the window title or modifying colors.

Here are some core insight provided by STÖK at DEFCON 31:

* The **nslookup** tool on Windows systems does not escape ANSI escape sequences if they are placed into DNS records and queried
* [**OSC8**](https://github.com/Alhadis/OSC8-Adoption?tab=readme-ov-file) supports hyperlinks such as **http://** and **https://** in the terminal. **OSC8** also supports **file://** schema specifiers and inline image embedding in PowerShell terminals. If the escape sequence is not properly terminated, it can cause the entire terminal output to become a single clickable hyperlink. This could allow clickbaiting attacks
* [**OSC52**](https://github.com/theimpostor/osc) enables tracking of mouse movements on the underlying system
* **Character Injection Multiplication:** An ANSI character multiplier code can print billions of characters into a terminal. This can be leveraged for Denial of Service (DoS) by overwhelming storage or processing capacity, resulting in a system crash. This technique was exploited via DNS records and other data commonly parsed in a terminal including when injected into a system log that gets printed to the screen.
* **OSC5113:** Supports direct [file transfer within the Kitty](https://sw.kovidgoyal.net/kitty/file-transfer-protocol/) terminal. This feature could be abused to introduce malicious files into a system without explicit user interaction.

### Whose Responsibility Are Exploitable Terminal Flaws?

As noted by the presenter STÖK, the responsibility for these vulnerabilities are passed between the maintainers of the terminal applications, and the developers of applications that interact with the terminal. Terminal app developers maintain that all programs should escape ANSI control sequences if they are untrusted user input since untrusted user input always presents a potential risk.

For example, as mentioned above, the **nslookup** tool for Windows was shown to not escape ANSI escape sequences placed in DNS records. From the perspective of terminal app developers either the **nslookup** tool or DNS providers should sanitize their user supplied data before outputting it. On the other hand, the developers of applications claim that the functionality provided by ANSI escape characters has grown to become egregious and unnecessarily risky. Sure, having different colors is useful, but more advanced features present higher risk.

## Other Terminal Hacking Research

Here are some other resources for those looking to expand their offensive security understanding of terminal-based attacks:

* **HD Moore (2003):** Digital Defense Incorporated - [TERMINAL EMULATOR SECURITY ISSUES](https://marc.info/?l=bugtraq&m=104612710031920&q=p3)
* **Giovanni "evilaliv3" Pellerano (2010):** [Nginx, Varnish, Cherokee, httpd, mini-httpd, WEBrick, Orion, AOLserver, Yaws and Boa log escape sequence injection](https://www.ush.it/team/ush/hack_httpd_escape/adv.txt)
* **Eviatar Gerzi (2022)** [Don’t Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters](https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters)
* **David Leadbeater (BlueHat 2023):** [Houdini of the terminal](https://www.youtube.com/watch?v=iIHw0KWgzAs) David's [GitHub repository](https://github.com/dgl)
* [CVE-2022-45872](https://nvd.nist.gov/vuln/detail/CVE-2022-45872) (CVSS 9.8 Critical): iTerm2 before 3.4.18 mishandles a DECRQSS response.

## Conclusion

The DEFCON 31 talk, *Weaponizing Plain Text ANSI Escape Sequences* by STÖK, highlights a history of vulnerabilities in terminal applications due to improper handling of ANSI escape sequences. These sequences can be exploited to display clickable links, file manipulation, and denial-of-service attacks. The presentation shows the potential for weaponizing these bugs and challenges the cybersecurity community to uncover more risks in terminal environments.

## Let's Connect

Share your details, and a member of our team will be in touch soon.

## Join our newsletter

## Table of Contents

1. What Are ANSI Escape Sequences?
2. Weaponizing ANSI Control Sequences to Poison Log Files
3. Whose Responsibility Are Exploitable Terminal Flaws?
4. Other Terminal Hacking Research
5. Conclusion

## Share

## Join our newsletter

## Explore in-depth resources from our ethical hackers to assist you and your team’s cyber-related decisions.

[See All](/resources/)

[![](https://images.ctfassets.net/yewqr8zk7e5s/21HBfwKAnJM8BPqUNisgZ3/94875cadf24542ddd2c29eed37fd2752/Ian2.png?w=776&h=524&q=80&fm=jpg&fit=scale)

### Why Multi-Factor Authentication is Not Enough

Knowing is half the battle, and the use and abuse of common frameworks shed insight into what defenders need to do to build defense in depth.

September 13, 2024 - **Blog**](/posts/why-multi-factor-authentication-is-not-enough/)[![](https://images.ctfassets.net/yewqr8zk7e5s/t2NuIHDuuREwyrvSovYBs/ef3a604d953330bcf27477f379ba2995/chris-liverani-dBI_My696Rk-unsplash.jpg?w=523&h=393&q=80&fm=jpg&fit=scale)

### The Top Cybersecurity Statistics for 2024

The top cybersecurity statistics for 2024 can help inform your organization's security strategies for 2025 and beyond. Learn more today.

November 19, 2024 - **Blog**](/posts/the-top-cybersecurity-statistics-for-2024/)[![](https://images.ctfassets.net/yewqr8zk7e5s/2Sq5ZIwjWfBAyCElrE1gSM/65ca4dbac3a34e87a9880a604dc8282c/img_0896.jpg?w=523&h=698&q=80&fm=jpg&fit=scale)

### Packetlabs at SecTor 2024

Packetlabs is thrilled to have been a part of SecTor 2024. Learn more about our top takeaway's from this year's Black Hat event.

October 24, 2024 - **Blog**](/posts/packetlabs-at-sector-2024/)

## Uncover exploitable weaknesses before attackers do.

Book your discovery call with our team of Offensive Security experts.

[Contact Us](/contact-us/)

![Packetlabs Company Logo](https://images.ctfassets.net/yewqr8zk7e5s/4Zzt787ZGserJboyLA7agx/a0780b5b4efad7e2bf5d8e2ea9a241a2/Packetlabs_logo-Balancedx2.png?q=100)

* Toronto | HQ401 Bay Street, Suite 1600
  Toronto, Ontario, Canada
  M5H 2Y4
* San Francisco | Outpost580 California Street, 12th floor
  San Francisco, CA, USA
  94104
* Calgary | Outpost421 - 7th Ave SW, Suite 3000
  Calgary AB, Canada
  T2P 4K9
* Australia | OutpostPacketlabs Pty Ltd.
  ABN 14 691 178 542
  Level 24, 1 O'Connell St
  Sydney NSW 2000
* [![Linked In Icon](https://images.ctfassets.net/yewqr8zk7e5s/37R8QFiO9t771oNGGtHiHm/35e20860355c4ccb80bbe4a405cc5d58/In.svg)](https://www.linkedin.com/company/packetlabs-ltd-)[![Twitter / X Icon](https://images.ctfassets.net/yewqr8zk7e5s/3B7qZzTwm0MMNyM4QCVCuz/670352cc442912ddd8ed1019a185151f/Xx.svg)](https://x.com/pktlabs)[![Facebook Icon](https://images.ctfassets.net/yewqr8zk7e5s/1yptlnXDn0yaNNxiUw9RtG/69993bd2030cea0fd4cd4988a1ed59d6/Fb.svg)](https://www.facebook.com/packetlabs)

* [Contact Us](/contact-us/)
* [Partner Program](/partner-program/)
* [Resources](/resources/)
* [Careers](/careers/)
* [About Us](/about-packetlabs/)
* [Media](/media/)
* [FAQ](/faq/)
* [Get a Quote](/get-quote/)

© 2026 Packetlabs. All rights reserved.

[Privacy Policy](/privacy-policy/)
