---
title: "Don't Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters"
source_url: "https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters"
source_type: article
fetched: 2026-06-01
topic: safety
tags: ["ansi-escape", "bracketed-paste-bypass", "dos", "window-title", "CVE-2021-31701", "data-spoofing"]
summary: "CyberArkの脅威研究。ウィンドウタイトル変更DoS、Kubernetes自由記述欄でのANSIによる表示偽装、そして貼り付けデータ先頭に ESC[201~ を仕込んでブラケットペースト保護を早期終了させるバイパスを実証。複数CVEを列挙。"
relevance: "ブラケットペースト保護を逆手に取るバイパス手法を一次資料で確認でき、PTYへ流すペイロードから ESC[201~ 等を除去すべき具体的根拠になる。表示偽装は「画面を読む」層の信頼性にも直結。"
chars: 78493
---

* [Developer](https://developer.cyberark.com/)
* [Events](https://www.cyberark.com/events/)
* [Marketplace](https://community.cyberark.com/marketplace/s/)
* [Partners](https://cyberark.com/partners/)
* [Careers](https://www.cyberark.com/careers/)

* [![Read More](https://www.cyberark.com/wp-content/uploads/2024/10/cyberark-logo-tagline.svg)](https://www.cyberark.com/)
* [Why Identity Security](https://www.cyberark.com/why-identity-security/)
* Platform

  + - [![cora thumbnail](https://www.cyberark.com/wp-content/uploads/2024/05/cora-ai-nav.png)CyberArk CORA AI™](https://www.cyberark.com/products/cora-ai/)

      CyberArk CORA AI™ is your central hub of identity security-focused artificial intelligence capabilities.

      [Learn More](https://www.cyberark.com/products/cora-ai/)
    - [Identity Security Platform](https://www.cyberark.com/products/)

      Put security first without putting productivity second.

      [Explore Platform](https://www.cyberark.com/products/)
  + - * + [Access Management](https://www.cyberark.com/products/access-management/)
        + [Workforce Access](https://www.cyberark.com/products/workforce-identity/)
          - [Passwordless](https://www.cyberark.com/products/passwordless/)
          - [Single Sign-On](https://www.cyberark.com/products/single-sign-on/)
          - [Multi-Factor Authentication](https://www.cyberark.com/products/adaptive-multi-factor-authentication/)
          - [Workforce Password Management](https://www.cyberark.com/products/workforce-password-management/)
          - [Secure Web Sessions](https://www.cyberark.com/products/secure-web-sessions/)
        + [Customer Access](https://www.cyberark.com/products/customer-identity/)
          - [B2B Identity](https://www.cyberark.com/products/b2b-identity/)
      * + [Secure Cloud Access](https://www.cyberark.com/products/secure-cloud-access/)
    - * + [Privileged Access](https://www.cyberark.com/products/privileged-access/)
        + [Privileged Access Management](https://www.cyberark.com/products/privileged-access-manager/)
        + [Vendor Privileged Access](https://www.cyberark.com/products/vendor-privileged-access-manager/)
      * + [Endpoint Identity Security](https://www.cyberark.com/products/endpoint-identity-security/)
        + [Endpoint Privilege Manager](https://www.cyberark.com/products/endpoint-privilege-manager/)
      * + [Modern Identity Governance Automation](https://www.cyberark.com/products/modern-iga/)
        + [User Access Review Compliance](https://www.cyberark.com/products/user-access-review/)
        + [Provisioning](https://www.cyberark.com/products/provisioning/)
        + [Lifecycle Management](https://www.cyberark.com/products/lifecycle-management/)
        + [Flows](https://www.cyberark.com/products/identity-flows/)
    - * + [Machine Identity Security](https://www.cyberark.com/products/machine-identity-security/)
        + [Secrets Management](https://www.cyberark.com/products/secrets-management/)
          - [Secrets Manager, SaaS](https://www.cyberark.com/products/secrets-manager-saas/)
          - [Secrets Manager, Self-Hosted](https://www.cyberark.com/products/secrets-manager-self-hosted/)
          - [Secrets Hub](https://www.cyberark.com/products/secrets-hub/)
          - [Credential Providers](https://www.cyberark.com/products/credential-providers/)
        + [Certificate Management](https://www.cyberark.com/products/certificate-management/)
          - [Certificate Manager](https://www.cyberark.com/products/certificate-manager/)
          - [Certificate Manager for Kubernetes](https://www.cyberark.com/products/certificate-manager-for-kubernetes/)
          - [Code Sign Manager](https://www.cyberark.com/products/code-sign-manager/)
          - [Zero Touch PKI](https://www.cyberark.com/products/zero-touch-pki/)
          - [SSH Manager for Machines](https://www.cyberark.com/products/ssh-manager-for-machines/)
        + [Workload Identity](https://www.cyberark.com/products/workload-identity-manager/)
* Solutions

  + - [![cora thumbnail](https://www.cyberark.com/wp-content/uploads/2024/05/cora-ai-nav.png)CyberArk CORA AI™](https://www.cyberark.com/products/cora-ai/)

      CyberArk CORA AI™ is your central hub of identity security-focused artificial intelligence capabilities.

      [Learn More](https://www.cyberark.com/products/cora-ai/)
    - [Identity Security Offerings](https://www.cyberark.com/solutions/)

      Find the right CyberArk identity security solution for your organization.

      [Explore Solutions](https://www.cyberark.com/solutions/)
  + - * + Human
        + [Secure Your Workforce](https://www.cyberark.com/solutions/secure-your-workforce/)
        + [Secure Endpoints and Servers](https://www.cyberark.com/solutions/secure-endpoints-and-servers/)
        + [Secure IT Administrators](https://www.cyberark.com/solutions/secure-it-admin-access/)
        + [Secure Access to Modern Infrastructure](https://www.cyberark.com/solutions/secure-access-to-modern-infrastructure/)
        + [Secure External Access](https://www.cyberark.com/solutions/secure-external-access/)
        + [Identity Governance](https://www.cyberark.com/solutions/identity-governance/)
    - * + Machine
        + [Secure Secrets and Workloads](https://www.cyberark.com/solutions/secure-secrets-and-workloads/)
        + [Secure Certificates and PKI](https://www.cyberark.com/solutions/secure-certificates-and-pki/)
      * + AI
        + [Secure AI Agents](https://www.cyberark.com/solutions/secure-agentic-ai/)
    - * + Industries
        + [Automotive](https://www.cyberark.com/solutions/automotive/)
        + [Banking](https://www.cyberark.com/solutions/banking/)
        + [Critical Infrastructure](https://www.cyberark.com/solutions/critical-infrastructure/)
        + [Financial Services](https://www.cyberark.com/solutions/financial-services/)
        + [Government](https://www.cyberark.com/solutions/government/)
        + [Healthcare](https://www.cyberark.com/solutions/healthcare/)
        + [Insurance](https://www.cyberark.com/solutions/insurance/)
        + [Manufacturing](https://www.cyberark.com/solutions/manufacturing/)
        + - * [Managed Service Providers](https://www.cyberark.com/solutions/managed-service-providers/)
* Services & Support

  + - [How Can We Help?](https://www.cyberark.com/services-support/)

      Expert guidance from strategy to implementation.

      [Services & Support](https://www.cyberark.com/services-support/)
  + - * Customer Success
      * [Customer Stories](https://www.cyberark.com/customer-stories/)
      * [CyberArk Blueprint](https://www.cyberark.com/blueprint/)
      * [Success Subscriptions](https://www.cyberark.com/success-subscriptions/)
    - * Learning
      * [CyberArk University](https://training.cyberark.com/)
      * [Certification](https://www.cyberark.com/services-support/certification/)
      * [Training](https://www.cyberark.com/services-support/training/)
    - * Services
      * [Design & Deployment Services](https://www.cyberark.com/services-support/design-deployment/)
      * [Red Team Services](https://www.cyberark.com/services-support/red-team-services/)
      * [Remediation Services](https://www.cyberark.com/services-support/remediation/)
      * [Strategic Consulting Services](https://www.cyberark.com/services-support/strategic-consulting/)
      * [Cloud Native Consulting](https://www.cyberark.com/services-support/cloud-native-consulting/)
    - * Support
      * [Product Documentation](https://docs.cyberark.com/portal/latest/en/docs.htm)
      * [Community](https://community.cyberark.com/s/)
      * [Technical Support](https://www.cyberark.com/services-support/technical-support/)
* Resources

  + - [Resource Center](https://www.cyberark.com/resources)

      Up your security I.Q. by checking out our collection of curated resources.

      [Explore Now](https://www.cyberark.com/resources)
  + - * Security Matters
      * [Blog](https://www.cyberark.com/resources/all-blog-posts)
      * [Security Matters Podcast](https://www.cyberark.com/podcasts/)
      * [CIO Connection](https://www.cyberark.com/cio-connection/)
      * [Cyber Unit](https://www.cyberark.com/cybr-unit/)
      * [CyberArk Labs](https://labs.cyberark.com/)
    - * Learn & Connect
      * [Resource Center](https://www.cyberark.com/resources)
      * [Customer Stories](https://www.cyberark.com/customer-stories/)
      * [Events](https://www.cyberark.com/events/)
      * [Webinar Replays](https://www.cyberark.com/resources/webinars)
      * [CyberArk University](https://training.cyberark.com/learn)
* Demos & Trials

  + - [Demos & Trials](https://www.cyberark.com/try-buy/)

      Get started with one of our 30-day trials.

      [Start a Trial](https://www.cyberark.com/try-buy/)
  + - [How to Buy](https://www.cyberark.com/how-to-buy/)

      Evaluate, purchase and renew CyberArk Identity Security solutions.
    - [Contact Us](https://www.cyberark.com/contact/)

      How can we help you move fearlessly forward?
    - [Identity Security Subscriptions](https://www.cyberark.com/identity-security-subscriptions/)

      Learn more about our subscription offerings.
* [Request a Demo](https://www.cyberark.com/request-demo/)
* Search

  + Search:
* [Developer](https://developer.cyberark.com/)
* [Events](https://www.cyberark.com/events/)
* [Marketplace](https://community.cyberark.com/marketplace/s/)
* [Partners](https://www.cyberark.com/partners/)
* [Careers](https://www.cyberark.com/careers/)
* Menu Item

  ![globe icon](https://www.cyberark.com/wp-content/uploads/2020/12/Icons-Globe@2x.png)

  + - [Deutsch](https://www.cyberark.com/de/ "Switch to Deutsch")
    - [Français](https://www.cyberark.com/fr/ "Switch to Français")
    - [Italiano](https://www.cyberark.com/it/ "Switch to Italiano")
    - [Español](https://www.cyberark.com/es/ "Switch to Español")
    - [日本語](https://www.cyberark.com/ja/ "Switch to 日本語")
    - [简体中文](https://www.cyberark.com/zh-hans/ "Switch to 简体中文")
    - [繁體中文](https://www.cyberark.com/zh-hant/ "Switch to 繁體中文")
    - [한국어](https://www.cyberark.com/ko/ "Switch to 한국어")

English – CyberArk Software Inc

## Up Your Security I.Q. by Checking Out Our Collection of Curated Resources.

![loading](https://content.cdntwrk.com/img/hubs/ajax-loader-white-2x.gif?v=19a554b579c4)

[English – CyberArk Software Inc](https://www.cyberark.com/resources "English – CyberArk Software Inc")

* Products & Services
  + Products & Services
  + [Cloud Security](https://www.cyberark.com/resources/cloud-security)
  + [Customer Access](https://www.cyberark.com/resources/customer-access)
  + [Endpoint Privilege Manager](https://www.cyberark.com/resources/endpoint-privilege-security)
  + [Identity Management](https://www.cyberark.com/resources/identity-management)
  + [Privileged Access Management](https://www.cyberark.com/resources/privileged-access-management)
  + [Modern IGA](https://www.cyberark.com/resources/modern-iga)
  + [Secrets Management](https://www.cyberark.com/resources/secrets-management)
  + [Services & Support​](https://www.cyberark.com/resources/services-support)
  + [Shared Services](https://www.cyberark.com/resources/shared-services)
  + [Workforce Access](https://www.cyberark.com/resources/workforce-access)
  + [Machine Identity](https://www.cyberark.com/resources/machine-identity)
* Topics
  + Topics
  + [Agentic AI Security](https://www.cyberark.com/resources/agentic-ai-security)
  + [Access Management](https://www.cyberark.com/resources/access-management)
  + [Best Practices](https://www.cyberark.com/resources/best-practices)
  + [DevSecOps](https://www.cyberark.com/resources/devsecops)
  + [Endpoint Security](https://www.cyberark.com/resources/endpoint-security)
  + [Machine Identity Security](https://www.cyberark.com/resources/machine-identity-security)
  + [Identity Security](https://www.cyberark.com/resources/identity-security)
  + [Identity Governance & Administration](https://www.cyberark.com/resources/identity-governance-administration)
  + [Hybrid and Multi-Cloud Security](https://www.cyberark.com/resources/hybrid-and-multi-cloud-security)
  + [IT Security Audit and Compliance](https://www.cyberark.com/resources/it-security-audit-and-compliance)
  + [Least Privilege](https://www.cyberark.com/resources/least-privilege)
  + [Partners](https://www.cyberark.com/resources/partners)
  + [Ransomware Protection](https://www.cyberark.com/resources/ransomware-protection)
  + [Remote Access](https://www.cyberark.com/resources/remote-access)
  + [Robotic Process Automation](https://www.cyberark.com/resources/robotic-process-automation)
  + [Threat Research​](https://www.cyberark.com/resources/threat-research)
  + [Zero Trust](https://www.cyberark.com/resources/zero-trust)
* Industry
  + Industry
  + [Federal](https://www.cyberark.com/resources/federal)
  + [Financial Services](https://www.cyberark.com/resources/financial-services)
  + [Healthcare​](https://www.cyberark.com/resources/healthcare)
  + [Higher Education](https://www.cyberark.com/resources/higher-education)
  + [Insurance](https://www.cyberark.com/resources/insurance)
  + [Manufacturing](https://www.cyberark.com/resources/manufacturing)
* Content Type
  + Content Type
  + [Analyst Reports](https://www.cyberark.com/resources/analyst-reports)
  + [Blog Articles](https://www.cyberark.com/resources/all-blog-posts)
  + [Customer Stories](https://www.cyberark.com/customer-stories/)
  + [eBooks​](https://www.cyberark.com/resources/ebooks)
  + [Executive Insights](https://www.cyberark.com/resources/executive-insights)
  + [Infographics​](https://www.cyberark.com/resources/infographics)
  + [Podcasts](https://www.cyberark.com/podcasts/)
  + [Product Announcements](https://www.cyberark.com/resources/product-announcements)
  + [Product Datasheets​](https://www.cyberark.com/resources/product-datasheets)
  + [Solution Briefs​](https://www.cyberark.com/resources/solution-briefs)
  + [Tools & Blueprints](https://www.cyberark.com/resources/tools-blueprints)
  + [Webinars](https://www.cyberark.com/resources/webinars)
  + [Videos](https://www.cyberark.com/resources/videos)
  + [Whitepapers​](https://www.cyberark.com/resources/white-papers)

×

[Home](https://www.cyberark.com/resources)
»
[Threat Research Blog](https://www.cyberark.com/resources/threat-research-blog)
»
Don’t Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters

×
Share this Article

* [Facebook](https://www.facebook.com/sharer/sharer.php?u=https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters)
* [Twitter](https://twitter.com/share?text=Don’t Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters&url=https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters)
* [Email](/cdn-cgi/l/email-protection#300f4345525a5553440d735f5e44555e441056425f5d105d49107845521116515d400b525f54490d735855535b105f4544104758514416130003090b431058514040555e595e5710514410734952554271425b116c5e6c5e745f5e16424341455f0b441064424543441064585943106459445c550a1071524543595e57106455425d595e515c10755d455c51445f4243104759445810717e63791075435351405510735851425153445542436c5e7f5e55105451491c104758595c5510791047514310475f425b595e57105f5e107f40555e63585956441c1051107b455255425e5544554310545943444259524544595f5e1052491062555478514410565f5345435554105f5e10545546555c5f40554210554840554259555e535510515e54105140405c59535144595f5e1043555345425944491c1079105e5f445953555410445851441079104751431051525c5510445f10595e5a55534410717e63791055435351405510535851425153445542431e1e1e6c5e6c5e58444440430a1f1f4747471e534952554251425b1e535f5d1f4255435f45425355431f4458425551441d42554355514253581d525c5f571f545f5e441d44424543441d445859431d4459445c551d51524543595e571d4455425d595e515c1d555d455c51445f42431d475944581d515e43591d5543535140551d53585142515344554243)
* [LinkedIn](https://www.linkedin.com/shareArticle?mini=true&url=https://www.cyberark.com/resources/threat-research-blog/dont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters&title=Don’t Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters&summary=One day, while I was working on OpenShift, a Kubernetes distribution by RedHat focused on developer experience and application security, I noticed that I was able to inject ANSI escape characters...)

# Don’t Trust This Title: Abusing Terminal Emulators with ANSI Escape Characters

January 6, 2022
Eviatar Gerzi

* Share this Article
* [Facebook](https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.cyberark.com%2Fresources%2Fthreat-research-blog%2Fdont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters)
* [Twitter](https://twitter.com/share?text=Don%E2%80%99t%20Trust%20This%20Title%3A%20Abusing%20Terminal%20Emulators%20with%20ANSI%20Escape%20Characters&url=https%3A%2F%2Fwww.cyberark.com%2Fresources%2Fthreat-research-blog%2Fdont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters&via=CyberArk)
* [Email](/cdn-cgi/l/email-protection#3e014d4b5c545b5d4a037d51504a5b504a1b0c0e584c51531b0c0e53471b0c0e764b5c1b0c0f185f534e055c515a47037d565b5d551b0c0e514b4a1b0c0e49565f4a1b0c094d1b0c0e565f4e4e5b505750591b0c0e5f4a1b0c0e7d475c5b4c7f4c551b0c0f1b0e7f1b0e7f7a51501b7b0c1b060e1b07074a1b0c0e6a4c4b4d4a1b0c0e6a56574d1b0c0e6a574a525b1b0d7f1b0c0e7f5c4b4d5750591b0c0e6a5b4c5357505f521b0c0e7b534b525f4a514c4d1b0c0e49574a561b0c0e7f706d771b0c0e7b4d5d5f4e5b1b0c0e7d565f4c5f5d4a5b4c4d1b0e7f71505b1b0c0e5a5f471b0c7d1b0c0e495657525b1b0c0e771b0c0e495f4d1b0c0e49514c555750591b0c0e51501b0c0e714e5b506d5657584a1b0c7d1b0c0e5f1b0c0e754b5c5b4c505b4a5b4d1b0c0e5a574d4a4c575c4b4a5751501b0c0e5c471b0c0e6c5b5a765f4a1b0c0e58515d4b4d5b5a1b0c0e51501b0c0e5a5b485b52514e5b4c1b0c0e5b464e5b4c575b505d5b1b0c0e5f505a1b0c0e5f4e4e52575d5f4a5751501b0c0e4d5b5d4b4c574a471b0c7d1b0c0e771b0c0e50514a575d5b5a1b0c0e4a565f4a1b0c0e771b0c0e495f4d1b0c0e5f5c525b1b0c0e4a511b0c0e5750545b5d4a1b0c0e7f706d771b0c0e5b4d5d5f4e5b1b0c0e5d565f4c5f5d4a5b4c4d1010101b0e7f1b0e7f564a4a4e4d1b0d7f1b0c781b0c78494949105d475c5b4c5f4c55105d51531b0c784c5b4d514b4c5d5b4d1b0c784a564c5b5f4a134c5b4d5b5f4c5d56135c5251591b0c785a51504a134a4c4b4d4a134a56574d134a574a525b135f5c4b4d575059134a5b4c5357505f52135b534b525f4a514c4d1349574a56135f504d57135b4d5d5f4e5b135d565f4c5f5d4a5b4c4d)
* [LinkedIn](https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fwww.cyberark.com%2Fresources%2Fthreat-research-blog%2Fdont-trust-this-title-abusing-terminal-emulators-with-ansi-escape-characters&title=Don%E2%80%99t%20Trust%20This%20Title%3A%20Abusing%20Terminal%20Emulators%20with%20ANSI%20Escape%20Characters&summary=One%20day%2C%20while%20I%20was%20working%20on%20OpenShift%2C%20a%20Kubernetes%20distribution%20by%20RedHat%20focused%20on%20developer%20experience%20and%20application%20security%2C%20I%20noticed%20that%20I%20was%20able%20to%20inject%20ANSI%20escape%20characters...)

![](https://www.cyberark.com/wp-content/uploads/2021/12/dont-trust-hero.jpg)

One day, while I was working on OpenShift, a Kubernetes distribution by RedHat focused on developer experience and application security, I noticed that I was able to inject ANSI escape characters to components in the web application. When a user reads the data with the injected ANSI escape characters, it executes the injected commands — in my case, changing the color of the terminal. I thought it was interesting but wasn’t sure if it was something serious.

Back then, my knowledge about ANSI escape characters was mostly about changing colors. I wondered if there was a vulnerability in the parsing of the colors that could lead to executing arbitrary commands. Beyond my initial curiosity, I didn’t immediately pursue further investigation.

When the time came to start new research, I remembered the issue I saw in OpenShift and thought it could be interesting to investigate. This is what led me to learn about ANSI escape characters. Frankly, I didn’t understand what I was getting into. I found that there were many types of ANSI escape characters codes, which made me decide that this research could be very interesting.

In this blog post, I am going to show you how research on terminal emulators took a different turn when I found a remote denial of service (DoS) vulnerability by abusing a Windows system call indirectly. We will show how this issue further affects other components, which may surprise you. This research led us to a total of nine vulnerabilities in different terminals. Buckle up; we are starting now.

## TL;DR

This research led to:

* Five high severity vulnerabilities: [CVE-2021-28847](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-28847), [CVE-2021-28848](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-28848), [CVE-2021-32198](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-32198), [CVE-2021-33500](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-33500) and [CVE-2021-42095](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-42095). We found a way to cause a remote DoS on the terminal client’s host.
* An ANSI escape characters injection vulnerability in OpenShift and Kubernetes ([CVE-2021-25743](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-25743)).
* Three additional vulnerabilities: [CVE-2021-31701](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-31701), [CVE-2021-37326](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-37326) and [CVE-2021-40147](http://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-37326). We found a way to bypass the bracket paste mode mechanism inside the terminals.

## Terminal Emulators

Almost everyone who works with a computer has had the chance to use a terminal emulator. A terminal emulator (Figure 1) is a computer program that mimics a video terminal with access to a local or distant host. This is the black window that you typically see in hacker movies. The terminal emulator provides us with only a screen and a set of commands to run on the system. It removes all the overhead of the graphics and makes things faster and efficient in case we need to do specific tasks that don’t require the use of graphics. We can look at it as a text-based system for navigating through the operating system.

![PuTTY Terminal Emulator](https://www.cyberark.com/wp-content/uploads/2021/12/1.PuTTY-Terminal-Emulator.jpg)

*Figure 1 – PuTTY Terminal Emulator*

## History

Terminal emulators have been around since the beginning of operating systems. Before PCs, people used terminals, which were physical machines that looked like PCs and were used in universities in the 1970s. One of them was the [VT100](https://en.wikipedia.org/wiki/VT100). Terminals had a monitor and keyboard, but they were linked to a large mainframe in server space.

Today we still have terminals — for example, the default CMD terminal in Windows and *bash* and *sh* (bourne shell) in Linux. But there are a lot more like PuTTY, MobaXterm, Terminator and so on. Which brings us to the question: What would happen if there were a critical vulnerability in one of them?

The problem is that it can affect anyone who uses terminals to connect to a remote server. This can range from private users to IT admins, developers and so on, meaning — lots of users.

## Searching for Attack Vectors

I started by checking the kind of attacks that have been executed against terminals by searching for [related CVE](https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=terminal)s. This provides a historical view of potential risk and influences the development of new approaches, including new attack vectors.

The standard way to access a terminal begins when a user starts a terminal and connects to a server, so the attack vectors that I focused on were targeting the client:

1. Assuming we are inside a server, create a malicious string inside a file that exploits a vulnerability in the terminal, when printed, to run code unintentionally by the user. When the user connects to the terminal and opens this file, it will run an arbitrary command. Another result can be remote code execution on the client’s host.
2. A vulnerability in the connection between that client terminal to the SSH server will eventually allow running code on the client’s host.

I decided to start with the first attack vector because it sounded easier. I began with an open-source terminal like [PuTTY](https://www.putty.org/) (0.74) because this is a common terminal that I can debug easily.

## How Terminals Can Be Abused

There is an interesting [advisory from 2003](https://marc.info/?l=bugtraq&m=104612710031920&q=p3) by Digital Defense Incorporated about terminal emulator security issues, which did a good review of the issues we are facing. Some of these security issues are also described in the “[A Blast From the Past](https://www.proteansec.com/linux/blast-past-executing-code-terminal-emulators-via-escape-sequences/)” article, so I won’t cover all of them — only the one I used in my research.

In my case, I wanted to find a problem in the way the terminal parses text, which led me to learn about ANSI escape characters.

### ANSI Escape Characters

These are special characters that the terminal won’t read as regular text. It will be read like a command. It will usually start with the ASCII escape character ESC (0x1B in hexadecimal) and followed by a specific set of arguments. These are control characters that can change text attributes (colors), move the cursor position, change the window title and so on. It is divided into categories that are elaborated [here](https://en.wikipedia.org/wiki/ANSI_escape_code#Description).

For example, there is the [OSC (Operating System Command)](https://ttssh2.osdn.jp/manual/4/en/about/ctrlseq.html#OSC) sequences category with commands beginning with ESC ], followed by a set of commands, and ends with BEL (Bell 0x7) or ST (String Terminator 0x9C) sign (Figure 2).

We can change the window title of our terminal by printing this string: \e]0;Title\a.
![Analyze of OSC sequence](https://www.cyberark.com/wp-content/uploads/2021/12/2.Analyze-of-OSC-sequence-.jpg)

*Figure 2 – Analysis of OSC sequence*

Notice that it won’t work in some terminals because of the .bashrc file that loads the title every time your press ENTER, so you will need to disable it from this file first.

You might think, “It’s only a title; what are you going to do, title me?” Well, notice these [eight vulnerabilities from 2003](https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=terminal) (Figure 3) in the window title that allowed code execution on the terminal. Because of the similarity of the terminals, one vulnerability could affect multiple terminals.

![Vulnerabilities-in-the-modification of window title](https://www.cyberark.com/wp-content/uploads/2021/12/3.Vulnerabilities-in-the-modification-of-window-title.jpg)

*Figure 3 – Vulnerabilities in the modification of window title ([taken from MITRE](https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=terminal))*

### Learning from the Past: Code Execution by Modifying the Windows Title

I was searching for a bug in ANSI characters that respond to a change of the window’s title. One of the things I did was check how the previous bugs were exploited. One of them, [CVE-2015-8971](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2015-8971) ([found by Nicolas Braud-Santoni](https://www.openwall.com/lists/oss-security/2016/11/04/12)), was a bug in Terminology 0.7.0 that didn’t filter new line (\n) escape character when changing the window title. It allowed you to modify the window title and then re-insert it into the terminal’s input buffer, resulting in arbitrary terminal input, which then caused code execution. The malicious string (Figure 4) could be inserted into a file, and when the user opened the file, it would load this string:

```
\e]2;echo 'evil'\n\a\e]2;?\a
```

![Analyze of code execution vulnerability in window title](https://www.cyberark.com/wp-content/uploads/2021/12/4.Analyze-of-code-executiong-vulnerability-in-window-title.jpg)

*Figure 4 – Analysis of code execution vulnerability in window title*

When this malicious string is being printed, the string echo ‘evil’\n gets written to the user’s terminal’s input buffer, resulting in that command being executed by the user’s shell.

## From Changing Window Title to DoS

The code execution vulnerability gave me several ideas to try. I opened a terminal to a remote Linux server and tried some weird ANSI combinations, logical hacks, corruptions, you name it — but none of them worked on the window title. At this point, I became a little bit dejected because it seemed that my other option was to move forward to another attack vector although I felt that the potential of exploiting ANSI escape characters is larger. I just needed to find the way.

It’s when I needed to go to a meeting, seconds from locking the machine when I thought to run a piece of code that expressed my feelings. I wrote a code that changes the window title … all the time using an infinite loop:

```
perl -e 'while(1){print "\e]0;pwn\a"};'
```

I told the terminal, “take that,” and left for the meeting.

When I came back from the meeting, something was strange. Everything was frozen, except for my mouse, which is also known as the “White Screen of Death” (WSOD). I couldn’t work. The only option was to restart the computer. I was intrigued by why changing the terminal title affected the whole computer, making it impossible to do anything.

### Analyzing SetWindowText Behavior

Remember that I was working on with PuTTY; I checked what function is being used to change the window title and found that there is a function do\_osc (in terminal.c) that processes the OSC sequences and in one of the conditions calls win\_set\_title that will eventually call wintw\_set\_title (Figure 5).

![](https://www.cyberark.com/wp-content/uploads/2021/12/6.wintw-set-title-function-from-window-c-in-PuTTY-project.jpg)

*Figure 5 – wintw\_set\_title function from window.c in PuTTY project*

We can see that the title is being changed by the macro SetWindowText (Figure 6), which can be SetWindowTextW or SetWindowTextA:

![](https://www.cyberark.com/wp-content/uploads/2021/12/7.SetWindowText-macro-from-WinUser-h-in-PuTTY-project.jpg)

*Figure 6 – SetWindowText macro from WinUser.h in PuTTY project*

In our case, PuTTY used SetWindowTextA (Figure 7).

![](https://www.cyberark.com/wp-content/uploads/2021/12/8.Monitoring-SetWindowTextA-with-API-monitor.jpg)

*Figure 7 – Monitoring SetWindowTextA with API monitor*

But the same behavior also happened with SetWindowTextW; therefore, I will use SetWindowText in the rest of the post.

The role of SetWindowText from the [documentation](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowtexta) is to:

*Change the text of the specified window’s title bar (if it has one).*

To understand more easily how SetWindowText is working I wrote a small GUI C++ that changes the title:

```
while (1) {
   SetWindowText(hWnd, L"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
}
```

When I ran it, the computer was extremely slow. It felt like the machine was frozen. It was much worse than what happened with PuTTY. When PuTTY changed the title, it was over the network, which caused it to be a little bit slower than my program which run without the network overhead. With my local application, you got WSOD immediately, and nothing worked. You were forced to restart the computer.

I continued to analyze and record the tracing:

![](https://www.cyberark.com/wp-content/uploads/2021/12/9.Tracing-of-SetWindowTextW.jpg)

*Figure 8 – Tracing of SetWindowTextW*

It’s hard to tell what object is causing the performance issue because this function eventually calls win32u.NtUserMessageCall and goes to the kernel:

![](https://www.cyberark.com/wp-content/uploads/2021/12/10.Call-to-NtUserMessageCall-from-IDA.jpg)

*Figure 9 – Call to NtUserMessageCall from IDA*

One thing that I noticed was the call to WindowProc. [Microsoft recommends](https://docs.microsoft.com/en-us/windows/win32/learnwin32/writing-the-window-procedure#avoiding-bottlenecks-in-your-window-procedure) avoiding bottlenecks in the window procedure, but it is not relevant to this issue because in our case, it affects the **entire** computer.

It seems to be performing extensive actions that cause everything to slow down. We reported it to Microsoft. You can see their answer in the summary of the SetWindowText Attack section below. TL;DR: They were able to reproduce it and opened it as a bug to their development team.

We reported this issue to PuTTY. It was fixed from version 0.75 and was assigned [CVE-2021-33500](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-33500). You can read more about this bug from [PuTTY’s report](https://www.chiark.greenend.org.uk/~sgtatham/putty/wishlist/vuln-windows-remote-title-dos.html).

### Affected Terminals and GdiDrawString

We tested all the famous terminals for Windows to see if they are also affected by this DoS. We noticed that most of them are vulnerable. We also found that it is not only because of the SetWindowText function, but there was also a similar function that behaved similarly.

In one of the cases, I tested the MobaXterm terminal, and I was surprised that it didn’t use SetWindowText function to change the window title but, rather, a function named GdipDrawString. The interesting thing in this case is that it didn’t affect the whole computer like SetWindowText. It affected only the application, which eventually crashed.
![](https://www.cyberark.com/wp-content/uploads/2021/12/11.Monitoring-GdiDrawString-with-API-monitor.jpg)

*Figure 10 – Monitoring GdiDrawString with API monitor*

The GdipDrawString is one of the [text functions exposed by the Windows GDI+](https://docs.microsoft.com/en-us/windows/win32/gdiplus/-gdiplus-text-flat), which is also documented [here](https://docs.microsoft.com/en-us/previous-versions/ms535991%28v%3Dvs.85%29). It seems that the use of graphic functions to write text multiple times can cause DoS if it isn’t being controlled. We reported it to MobaXterm that fixed this issue quickly ([CVE-2021-28847](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-28847)).

Another interesting finding is that I couldn’t cause DoS with Windows default terminals (cmd, Powershell, Windows Terminal and WSL). They were using the SetConsoleTitle function, which [according to Microsoft](https://docs.microsoft.com/en-us/windows/console/setconsoletitle), is no longer a part of their ecosystem roadmap. They preferred users to use the [virtual terminal sequences](https://docs.microsoft.com/en-us/windows/console/console-virtual-terminal-sequences) for maximum compatibility in cross-platform scenarios. This could expand the attack surface because it will require the programmer to make sure no one abuses these terminal sequences. A small example can be when someone writes something like that:

```
printf("\x1b\x5d\x30\x3b%s\x07", userTitle);
```

\x1b\x5d\x30\x3b → The start of a title ESC ] 0 ;.

\x07 → The end of a title.

If the attacker has control of the userTitle and can call it multiple times, it can cause DoS.

Here is a summary of our findings in the Windows terminals:

| **App** | **Category** | **OS** | **DoS** | **CVE** |
| --- | --- | --- | --- | --- |
| Customized C++ app | Local App | Windows | Yes SetWindowText → affects the whole computer  GdipDrawString → affects only the application |  |
| PuTTY | Terminal | Yes – the whole computer | [CVE-2021-33500](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-33500)  Fixed version: 0.75 |
| MobaXterm | Yes – only the application, it calls GdipDrawString, not SetWindowText | [CVE-2021-28847](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-28847)  Fixed version: 21.0 Preview3 |
| MinTTY | Yes | [CVE-2021-28848](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-28848)  Fixed version: 3.4.6 |
| Cygwin | Yes – uses MinTTY | See MinTTY |
| Git | Yes – uses MinTTY | See MinTTY Fixed version: v2.30.1 |
| PowerShell | No – uses SetConsoleTitle |  |
| Cmd | No – uses SetConsoleTitle |  |
| Windows Terminal | No – uses SetConsoleTitle |  |
| Visual Studio Code | No – uses Cmd |  |
| WSL | No |  |
| ZOC | Yes – only the application | [CVE-2021-32198](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-32198) (won’t fix) |
| XSHELL | Yes | [CVE-2021-42095](https://www.cve.org/CVERecord?id=CVE-2021-42095) |

*Table 1 – Summary of findings in Windows terminals*

## More Surprises: Creating DoS from Your Browser

We understand that the root problem is with the graphic functions, specifically with the function SetWindowText and not with the terminal. It means that if we can control any application to run an extensive use of SetWindowText (or GdipDrawString), we can create DoS. The implications of it are far beyond the terminal world as we will see next.

Almost every GUI application will use some graphic function like SetWindowText, but it doesn’t mean we can control it. On what other application can we control the window title passively? You guessed right: browsers!

An attack vector can be to send a link to a malicious website that changes the window title multiple times and will cause a denial of service. Some browsers, as we will see next, don’t consider denial-of-service attacks as a security vulnerability because causing memory-based hang ups are possible in different ways and not only changing the title. I suppose this is true, but I tried to cause memory-based hang ups by loading a page with JavaScript code that stores infinite variable data, and it didn’t affect the browsers that I checked. As you will see next, some of the results were strange.

#### Hanging Up Some Browsers

I started to check the most common browsers: Chrome, Edge and Firefox.

I created a simple HTML file that changes the title an infinite number of times. On the first attempt with Chrome, everything worked normally. The reason was because when I changed the title multiple times with the **same** string, Chrome had a check to see if you are using the same title. If it sees the same title, it won’t call SetWindowText. After adding a small fix to my HTML, each time changing the title, things started to get wild:

```
<script>
function myFunction() {
  var i = 0;

  while(1) {
	 if (i % 2 == 0) {
	    document.title = "A";
		i = 1;
	 } else {
	    document.title = "B";
		i = 0;
	 }
  }

  var x = document.title;

  document.getElementById("demo").innerHTML = x;
}
</script>
```

The whole browser got stuck, became blurred, and the only option was to terminate it. The same behavior happened with Edge.

![](https://www.cyberark.com/wp-content/uploads/2021/12/12.Monitoring-SetWindowTextW-with-API-monitor.jpg)

*Figure 11 – Monitoring SetWindowTextW with API monitor*

But notice that only the browser got stuck, not the computer. This is probably because modern browsers are based on sandboxes. The interesting thing is that this attack didn’t work on Firefox and Internet Explorer. Firefox even wrote that the page is slowing down (Figure 12), but you can still work on other tabs.

![](https://www.cyberark.com/wp-content/uploads/2021/12/13.FireFox-tab-crash.jpg)

*Figure 12 – FireFox tab crash*

Why did it happen only on Chrome and Edge and not on Firefox and Internet Explorer? The common thing with Chrome and Edge is that they are built on Chromium but … wait … if this is the reason, does it mean that **any** browser-based Chromium is affected by that? Yes! I checked any browser that I could find; all of them are based on Chromium, and on all of them it happened (see Table 2).

| **App** | **Category** | **Chromium Based** | **OS** | **DoS** |
| --- | --- | --- | --- | --- |
| Internet Explorer | Browser | No | Windows | No – it crashes only one tab but the browser can still work |
| FireFox |
| Chromium | Yes | Yes – Only the entire browser |
| Chrome |
| Edge |
| Torch |
| Maxthon |
| Opera |
| Vivaldi |

*Table 2 – Summary of findings in Windows terminals*

### BSOD from the Browser

The most shocking thing I found was that the SetWindowText attack on Chromium-based browsers not only hangs the browser but … wait for it … causes a BSOD\WSOD! (Figure 13). We have found that we could reproduce this behavior just on VMs, so it looks like it’s a resource- related issue.

![](https://www.cyberark.com/wp-content/uploads/2021/12/14.Bluescreen-after-browser-DoS.jpg)

*Figure 13 – Bluescreen after browser DoS*

It turns out that after the browsers start to change the title multiple times , and you maximize and minimize the window, the virtual machine starts to hang and after a couple of minutes gets a BSOD. I was able to reproduce it in every Chromium-based browser. The reproducing of this issue wasn’t trivial; in the first try I needed two separate windows, but if I involved one window with my local application — the one that ran SetWindowText multiple times — I could reproduce it. The strange thing is that I couldn’t reproduce it by just running my local application — it seems that the browser did more stuff that affected the virtual machine rather than just changing the Window.

![](https://fast.wistia.com/embed/medias/y3h1enf3d4/swatch)

We notified the affected vendors about this issue, and we opened a case on the root browser Chromium.

According to Google:

*Thanks for the report. DoS issues are treated as abuse or stability issues rather than security vulnerabilities. For more details, see:* [*https://chromium.googlesource.com/chromium/src/+/master/docs/security/faq.md#are-denial-of-service-issues-considered-security-bugs*](https://chromium.googlesource.com/chromium/src/%2B/master/docs/security/faq.md#are-denial-of-service-issues-considered-security-bugs) *.*

Therefore, I submitted a case about a crash, which they were able to reproduce. They did mention that they were able to reproduce it also on Linux:

*Note: Issue is not observed on Mac but is observed on Linux.*

We also reported it to VMware because it might be related to their driver vm3dmp.sys. Because it was not so easy to reproduce, they weren’t able to do it, and this is their response:

*We have reviewed the issue again. We were not able to reproduce the crash in the latest versions of WS 16.1.2 build-17966106 and Chrome 92.0.4515.131. We view that the behavior you observed might be depended on chrome version used as we didn’t see any BSOD issues on our end. Hence, we consider this as not a bug.*

##

## Other Applications Might be Affected by This

We saw that the abuse of the window title by terminals and browsers can cause a severe denial of service and can be used as a remote attack. Are there other applications that might be vulnerable? Yes, on every application that you can control some text changing, that will eventually call SetWindowText or GdipDrawString, possibly causing damage.

Think about all the messaging applications (Slack, Teams, Skype, etc.). What happens if one of your contacts changes its name? It might call SetWindowText, and if it can call it multiple times, theoretically, in the worst case, it can cause a denial of service to anyone who is in his contact list and has the application open in his Windows.

#### Putting the Theory to the Test

I was curious to see if this is something that is possible in some way or another. I thought to check it on the messaging application Slack for Windows.

The first thing I did was check what would happen if I changed my name on my computer. Does Slack in my contacts computer see this change immediately and call SetWindowText? You can see below (Figure 14) that it does!

![](https://www.cyberark.com/wp-content/uploads/2021/12/15.Monitoring-SetWindowTextW-by-Slack-with-API-monitor.jpg)

*Figure 14 – Monitoring SetWindowTextW by Slack with API monitor*

Great. All we have to do is to change my Slack profile many times until it causes a DoS to my contact (or contacts, if you do it in an irresponsible manner).

A little bit of reverse engineering (there is also documentation), and I found the REST API that changes the profile settings: ../api/users.profile.set.

But after only three times; it failed because of a rate limit (Figure 15).

![](https://www.cyberark.com/wp-content/uploads/2021/12/16.Slack-rate-limit-responds.jpg)

*Figure 15 – Slack rate limit responds*

I didn’t find a way to bypass the rate limit but bypassing it will place you in the next step when you might see if the changes are fast enough to cause a denial of service.

### Summary for the SetWindowText Attack

The extensive use of a function related to graphics seems to be with potential for DoS. There might be other functions that can be controlled like that. In our case, the SetWindowText attack was able to cause a denial of service from a remote server.

The root problem is with this function. In my tests, I also checked it on Windows 7, and there wasn’t an issue like in Windows 10.

The security group from Vivaldi Technologies wrote to me about this issue in their browser:

*This is a **design limitation** of Windows 10; it does not limit application memory usage, and simply uses pagefile (virtual memory) when it runs out of RAM. This is slower to respond because it must be read from disk.*

I also notified Microsoft about it, and they answered:

*Thank you again for your report. Our team was able to reproduce this issue, but it does not meet our bar for servicing with an immediate security update. While this results in a denial of service condition, this can only be triggered locally and is the result of resource exhaustion. An attacker would not be able to trigger any additional vulnerable conditions or retrieve information that would be beneficial in other attacks on the system.*
*We will be closing this case, but we have opened a bug with our development team, and they may consider addressing this in a future release of Windows*

It is important to mention that while Microsoft wrote that it is triggered locally, it can be triggered remotely, depending on how it was used in a program. For example, it is possible to create a malicious file on a remote server with a window title change command that when opening it from a terminal, will cause a denial of service. It is something I was able to do and reported to the terminal vendors who fixed it.

Let’s continue with our journey and see what else we can do with ANSI escape characters.

### Spoofing Data on Kubernetes and OpenShift

Remember the ANSI escape characters issue that I mentioned in the beginning of the article on OpenShift, a RedHat open-source container application platform based on the Kubernetes? I noticed something strange while I created projects. As a regular user, I had an option to create a project with a “Display Name” field (Figure 16). I noticed that this “Display Name” field doesn’t filter ANSI escape characters.

![](https://www.cyberark.com/wp-content/uploads/2021/12/17.Create-project-form-in-OpenShift.jpg)

*Figure 16 – Create project form in OpenShift*

I could add ANSI escape characters that will change the terminal window title, paint the terminal with whatever colors I choose, delete that display and so on.

When a user connects to the terminal and runs the command oc get projects. it will trigger the injected ANSI escape characters. I showed in the PoC how I can spoof that project’s data and inject the data that I want.

![](https://fast.wistia.com/embed/medias/nrw107j4zc/swatch)

We reported it to Red Hat. They confirmed this vulnerability and also mentioned (thanks to Sam Fowler and the team) that there is a larger impact:

*All free text fields (and there are many) in the OpenShift and Kubernetes APIs are susceptible to this, not only Project `displayNames`. For instance this affects the `message` field of an Event (a core k8s object). Those that can create Events can also inject command sequences that are unescaped when printed in a terminal emulator with `oc` or `kubectl`*

We checked it and confirmed that this also happens in Kubernetes, and they suggested reporting it to the upstream (Kubernetes). The problem is with the filtering of the JSON objects. It didn’t happen when trying to create such request with YAML objects because kubectl rejects it because of invalid characters. We reported it to Kubernetes, and their security team asked to open it as a public bug:

*We’ve decided we’re comfortable handling this through a public issue. Please go ahead and* [*open an issue*](https://github.com/kubernetes/kubernetes/issues/new?assignees=&labels=kind%2Fbug&template=bug-report.md)*, otherwise I can follow up.*

They also mentioned that they “*will treat it as a normal (**non-security**) bug for now”*.

I opened it as a [public bug](https://github.com/kubernetes/kubernetes/issues/101695), and here is an example PoC for spoofing data in Kubernetes Event.

![](https://fast.wistia.com/embed/medias/eboxg7aka2/swatch)

A few days after reporting it, a Kubernetes developer, Paco Xu, mentioned that it also affects the kubectl log. [On  19.11.2021](https://github.com/kubernetes-security/cvelist-public/pull/11) they assigned it with [CVE-2021-25743](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-25743).

It is time to talk about the last thing we found on this research.

### Bypassing the Bracket Paste Mode

One mechanism that is not very well known is the [bracket paste mode](http://www.xfree86.org/current/ctlseqs.html#Bracketed%20Paste%20Mode) (another good [explanation](https://cirw.in/blog/bracketed-paste)) that was created to protect against pasted text. When copying a command like echo ‘Hello’ and pasting it in your terminal, the terminal will execute the command. If the bracket paste mode is enabled, the code won’t run. Rather, it will wrap the code with ESC [ 200 ~ in the beginning and close it with ESC [ 201 ~. Your code will look like that: ESC[200~<code>ESC[201~. The code won’t be executed when pasting it to the terminal.

Why do we need it? Because of copy\paste attacks. These attacks are showing you a legitimate command to copy, while some HTML tricks hide a malicious command. There is a nice proof of concept that was created by [this website](https://thejh.net/misc/website-terminal-copy-paste).

To enable the bracket paste mode, you can run in your terminal: echo -ne “\e[?2004h”
To disable it: echo -ne “\e[?2004l”

When I saw it, I was wondering, “What if my code will start with ESC [ 200 ~ and then my malicious code?” My code will look like that (notice it has two lines; the second line is new line):

```
ESC[201~clear; echo "Bypass Bracketed Paste Mode"
```

The bracket paste mode will convert it to:

```
ESC[200~ESC[201~clear; echo "Bypass Bracketed Paste Mode"ESC[201~
```

In this case, it will be closed in the beginning and allow our command to escape from this bracket paste mode. When someone pastes it, it will escape and run the command in the terminal:

![](https://fast.wistia.com/embed/medias/ya4vgtr2y1/swatch)

We found three terminals affected by this vulnerability, [MinTTY](https://mintty.github.io/) ([CVE-2021-31701](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-31701)), Xshell ([CVE-2021-37326](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-37326)) and [ZOC](https://www.emtec.com/zoc/) ([CVE-2021-40147](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-40147)). They were fixed after the report. Notice that Git-Bash for Windows and Cygwin were also affected because they are using MinTTY.

| **App** | **Fixed Version** | **CVE** |
| --- | --- | --- |
| MinTTY | 3.4.7 | [CVE-2021-31701](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-31701) |
| Git for Windows | 2.31.1 |
| Xshell | Build 0077 | [CVE-2021-37326](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-37326) |
| ZOC | 8.02.2 | [CVE-2021-40147](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-40147) |

*Table 3*

## Mitigation

### Preventing SetWindowText

Almost all the terminals affected by the SetWindowText vulnerability fixed this issue. But it can be prevented by configuring the terminal to prevent the user from changing the title of the window. In each terminal, these settings can look different.

In PuTTY you can prevent it by ticking the box “Disable remote-controlled window title changing” (Figure 17).

![](https://www.cyberark.com/wp-content/uploads/2021/12/18.PuTTY-Disable-remote-controlled-window-title-changing-box.jpg)

*Figure 17 – PuTTY Disable remote-controlled window title changing box*

In MobaXterm, you can prevent it by right clicking on the session and choosing “Edit Session.” Under the “Bookmark setting,” tick the “Lock terminal title” box (Figure 18).

![](https://www.cyberark.com/wp-content/uploads/2021/12/19.MobaXterm-locking-terminal-title-setting.jpg)

*Figure 18 – MobaXterm locking terminal title setting*

Not all the terminals have such settings.

### Preventing Bracket Paste Mode

We reported all the vulnerabilities that we found to the terminals’ vendors, and they fixed them accordingly — but this mode might still be vulnerable. The best way to deal with it is to copy code from an unknown source, paste it first on some text editor, make sure it doesn’t contain a malicious code and paste it in the terminal.

### Summary

In this blog post, we had a glimpse of ANSI escape characters. We discovered that they are not just used for colors but also for commands. We also discovered how something like changing a Windows title has severe effects on the whole operating system and how, in the past, there were also code execution vulnerabilities.

We saw how ANSI escape characters from DevOps systems like OpenShift or Kubernetes have a connection through terminals and how it can affect the user of the terminal.

The ANSI escape characters weren’t the only things that we checked. The bracket paste mode, for example — something that is less known — was also vulnerable.

There are a lot more things to be discovered, such as the connection between the client and the server, other complex ANSI escape characters and so on. We encourage you to use the mitigations we proposed to help reduce the attack surface.

### References

<https://en.wikipedia.org/wiki/ANSI_escape_code>

<https://en.wikipedia.org/wiki/ANSI.SYS>

<https://vt100.net/docs/vt510-rm/chapter4.html>

<http://paulbourke.net/dataformats/ascii/>

<https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797>

[https://web.archive.org/web/20180103005750/https://www.twistlock.com/2017/11/20/cve-2017-16544-busybox-autocompletion-vulnerability/](https://web.archive.org/web/20180103005750/https%3A/www.twistlock.com/2017/11/20/cve-2017-16544-busybox-autocompletion-vulnerability/)

[https://web.archive.org/web/20180102213645/https://www.twistlock.com/2017/12/13/hiding-content-git-escape-sequence-twistlock-labs-experiment/](https://web.archive.org/web/20180102213645/https%3A/www.twistlock.com/2017/12/13/hiding-content-git-escape-sequence-twistlock-labs-experiment/)

<https://marc.info/?l=bugtraq&m=104612710031920&q=p3>

<https://seclists.org/oss-sec/2017/q2/183>

<http://www.openwall.com/lists/oss-security/2015/08/11/8>
<http://www.openwall.com/lists/oss-security/2015/09/17/5>
<http://www.openwall.com/lists/oss-security/2016/11/04/12>

[http://turbochaos.blogspot.com/2014/08/journalctl-terminal-escape-injection.html](https://turbochaos.blogspot.com/2014/08/journalctl-terminal-escape-injection.html)

<https://www.proteansec.com/linux/blast-past-executing-code-terminal-emulators-via-escape-sequences/>

<https://www.ush.it/team/ascii/hack-tricks_253C_CCC2008/wysinwyc/what_you_see_is_not_what_you_copy.txt>

<https://thejh.net/misc/website-terminal-copy-paste>

<https://cirw.in/blog/bracketed-paste>

<https://ttssh2.osdn.jp/manual/4/en/usage/tips/vim.html#Bracketed>

<https://ttssh2.osdn.jp/manual/4/en/about/ctrlseq.html>

<https://www.xfree86.org/current/ctlseqs.html#Mouse%20Tracking>

###### Previous Article

![Attacking RDP from Inside: How we abused named pipes for smart-card hijacking, unauthorized file system access to client machines and more](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2022%2F01%2Ftsk-hero.jpeg&size=1&version=1737014314&sig=a4deaf6d2faf8a5c4f028a378e78c9ce&default=)

Attacking RDP from Inside: How we abused named pipes for smart-card hijacking, unauthorized file system access to client machines and more

In this blog post we are going to discuss the details of a vulnerability in Windows Remote Desktop Services...

###### Next Article

![Hook Heaps and Live Free](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2021%2F11%2Fhook-heaps-featured-img.png&size=1&version=1737014315&sig=4cfe6f55ca2c37e63c539a03e28f6ca1&default=)

Hook Heaps and Live Free

I wanted to write this blog post to talk a bit about Cobalt Strike, function hooking and the Windows heap. ...

## Recommended for You

* [‹](#related-items-carousel)
* [›](#related-items-carousel)

![The art of the invisible key: Passkey global breakthrough](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2026%2F01%2Fpasskey-global-breakthrough-v1.png&size=1&version=1770099450&sig=c8e1d75c36a77d4bfe5b8acc48c700b0&default=)

The art of the invisible key: Passkey global breakthrough

#### xml encoding="UTF-8" Introduction Passkeys now protects billions of accounts, redefining how the world signs in through stronger, more secure authentication without a password. Yet this global movement runs deeper...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/the-art-of-the-invisible-key-passkey-global-breakthrough)

![CVE-2025-60021 (CVSS 9.8): command injection in Apache bRPC heap profiler](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2026%2F01%2Fcommand-injection-in-apache.png&size=1&version=1770040745&sig=c0232f292f5fc10e65dea0943381d5bc&default=)

CVE-2025-60021 (CVSS 9.8): command injection in Apache bRPC heap profiler

#### xml encoding="UTF-8" This research is published following the public release of a fix and CVE, in accordance with coordinated vulnerability disclosure best practices. CVE‑2025‑60021, a critical command injection issue...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/cve-2025-60021-cvss-9-8-command-injection-in-apache-brpc-heap-profiler)

![UNO reverse card: stealing cookies from cookie stealers](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2026%2F01%2Funo-reverse-card.png&size=1&version=1769608948&sig=0876559c5802cb7c241cbc092aef42da&default=)

UNO reverse card: stealing cookies from cookie stealers

#### xml encoding="UTF-8" Criminal infrastructure often fails for the same reasons it succeeds: it is rushed, reused, and poorly secured. In the case of StealC, the thin line between attacker and victim turned out to be...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/uno-reverse-card-stealing-cookies-from-cookie-stealers)

![Vulnhalla: Picking the true vulnerabilities from the CodeQL haystack](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F12%2Fvulnhalla-picking-the-true-vulnerabilities.png&size=1&version=1768487525&sig=08f1b6a99885ce18af26953b79b87655&default=)

Vulnhalla: Picking the true vulnerabilities from the CodeQL haystack

#### xml encoding="UTF-8" In this blog post, we present our approach for uncovering vulnerabilities by combining LLM reasoning with static analysis. By layering an LLM on top of CodeQL, we significantly reduce the...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/vulnhalla-picking-the-true-vulnerabilities-from-the-codeql-haystack)

![Racing and Fuzzing HTTP/3: Open-sourcing QuicDraw(H3)](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F11%2Fopen-sourcing-quicdraw-h3.jpg&size=1&version=1765364102&sig=1dce5c6d74ba81a9cefb7655b61d0c38&default=)

Racing and Fuzzing HTTP/3: Open-sourcing QuicDraw(H3)

#### xml encoding="UTF-8" This blog post provides a dive into HTTP/3’s evolution for security engineers, an overview of our research journey, and what led us to develop the open-source tool QuicDraw, which can be used for...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/racing-and-fuzzing-http-3-open-sourcing-quicdraw)

![Cheaters never win: large-scale campaign targets gamers who cheat with StealC and cryptojacking](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F09%2Fcover-image.jpg&size=1&version=1763475591&sig=c4bbeafebae9f996d8460379e71cf880&default=)

Cheaters never win: large-scale campaign targets gamers who cheat with StealC and cryptojacking

#### xml encoding="UTF-8" A sprawling cyber campaign is turning gamers’ hunger to gain an edge into a massive payday for threat actors who are leveraging over 250 malware samples to steal credentials and cryptocurrencies....

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/cheaters-never-win-large-scale-campaign-targets-gamers-who-cheat-with-stealc-and-cryptojacking)

![Defeating Microsoft EPM in the Race to Admin: a Tale of a LPE vulnerability](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F09%2Ftale-of-a-lpe-vulnerability.png&size=1&version=1761076752&sig=1fbb0e9ec4c3d89de96c9549dce5e3e8&default=)

Defeating Microsoft EPM in the Race to Admin: a Tale of a LPE vulnerability

#### xml encoding="UTF-8" Introduction Not too long ago I read an interesting blogpost by SpecterOps about Microsoft EPM that got my attention as I was not aware of this Microsoft product/feature. It was interesting to...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/defeating-microsoft-epm-in-the-race-to-admin-a-tale-of-a-lpe-vulnerability)

![C4 Bomb: Blowing Up Chrome’s AppBound Cookie Encryption](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F06%2Fc4-bomb-blog-hero.png&size=1&version=1756990787&sig=9af24e62e49693584b654549aee927e8&default=)

C4 Bomb: Blowing Up Chrome’s AppBound Cookie Encryption

#### xml encoding="UTF-8" In July 2024, Google introduced a new feature to better protect cookies in Chrome: AppBound Cookie Encryption. This new feature was able to disrupt the world of infostealers, forcing the malware...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/c4-bomb-blowing-up-chromes-appbound-cookie-encryption)

![Is your AI safe? Threat analysis of MCP (Model Context Protocol)](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F06%2FMCP-Threat-analysis.png&size=1&version=1754341152&sig=aea6fd3ad8fb6e2c91a706d9c14faecb&default=)

Is your AI safe? Threat analysis of MCP (Model Context Protocol)

#### xml encoding="UTF-8" Unless you lived under a rock for the past several months or started a digital detox, you have probably encountered the MCP initials (Model Context Protocol). But what is MCP? Is this just a...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/is-your-ai-safe-threat-analysis-of-mcp-model-context-protocol)

![Poison everywhere: No output from your MCP server is safe](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F05%2Fpoison-everywhere-blog.png&size=1&version=1765318223&sig=2d56346addee89a06bbacd84802c5146&default=)

Poison everywhere: No output from your MCP server is safe

#### xml encoding="UTF-8" The Model Context Protocol (MCP) is an open standard and open-source project from Anthropic that makes it quick and easy for developers to add real-world functionality — like sending emails or...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/poison-everywhere-no-output-from-your-mcp-server-is-safe)

![Unlocking New Jailbreaks with AI Explainability](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F04%2Funlocking-new-jailbreaks-ai.jpg&size=1&version=1754341152&sig=945c8c564c44ade40663fafa3f3913f1&default=)

Unlocking New Jailbreaks with AI Explainability

#### xml encoding="UTF-8" TL;DR In this post, we introduce our “Adversarial AI Explainability” research, a term we use to describe the intersection of AI explainability and adversarial attacks on Large Language Models...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/unlocking-new-jailbreaks-with-ai-explainability)

![Agents Under Attack: Threat Modeling Agentic AI](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F04%2Fagents-under-attack.jpg&size=1&version=1757354502&sig=377482fd12c836a6dc1908a35f9fe3ab&default=)

Agents Under Attack: Threat Modeling Agentic AI

#### xml encoding="UTF-8" Introduction The term “Agentic AI” has recently gained significant attention. Agentic systems are set to fulfill the promise of Generative AI—revolutionizing our lives in unprecedented ways. While...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/agents-under-attack-threat-modeling-agentic-ai)

![Jailbreaking Every LLM With One Simple Click](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F04%2Fjailbreak-hero-rectangle.png&size=1&version=1744236481&sig=532c6dfde4538ffb1c8a981915d83ae8&default=)

Jailbreaking Every LLM With One Simple Click

#### xml encoding="UTF-8" In the past two years, large language models (LLMs), especially chatbots, have exploded onto the scene. Everyone and their grandmother are using them these days. Generative AI is pervasive in...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/jailbreaking-every-llm-with-one-simple-click)

![Captain MassJacker Sparrow: Uncovering the Malware’s Buried Treasure](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F03%2Fcaptain-massJacker-sparrow.png&size=1&version=1743523369&sig=23e1d72c2bc29728f10b4eaa276a9fd7&default=)

Captain MassJacker Sparrow: Uncovering the Malware’s Buried Treasure

#### xml encoding="UTF-8" Cryptojacking malware—a type of malware that tries to steal cryptocurrencies from users on infected machines. Curiously, this kind of malware isn’t nearly as famous as ransomware or even...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/captain-massjacker-sparrow-uncovering-the-malwares-buried-treasure)

![Let’s Be Authentik: You Can’t Always Leak ORMs](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F02%2Fauthentik-blog.png&size=1&version=1762944449&sig=4f6f5120467d378cb11da34d53f0c218&default=)

Let’s Be Authentik: You Can’t Always Leak ORMs

#### xml encoding="UTF-8" Introduction Identity providers (IdPs) or Identity and Access Management (IAM) solutions are essential for implementing secure and efficient user authentication and authorization in every...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/lets-be-authentik-you-cant-always-leak-orms)

![How Secure Is Your OAuth? Insights from 100 Websites](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2025%2F02%2Foauth-cover.png&size=1&version=1765318223&sig=174f1e1b8ab62cb8473ac4dddac4e14e&default=)

How Secure Is Your OAuth? Insights from 100 Websites

#### xml encoding="UTF-8" You might not recognize the term “OAuth,” otherwise known as Open Authorization, but chances are you’ve used it without even realizing it. Every time you log into an app or website using Google,...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/how-secure-is-your-oauth-insights-from-100-websites)

![Teach Yourself Kubiscan in 7 Minutes (or Less…)](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2024%2F11%2Fyourself-kubiscan.png&size=1&version=1739896187&sig=ebe1d3d6432878f7d245564d7874e767&default=)

Teach Yourself Kubiscan in 7 Minutes (or Less…)

#### xml encoding="UTF-8" While Kubernetes’ Role-based access control (RBAC) authorization model is an essential part of securing Kubernetes, managing it has proven to be a significant challenge — especially when dealing...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/teach-yourself-kubiscan-in-7-minutes-or-less)

![ByteCodeLLM – Privacy in the LLM Era: Byte Code to Source Code](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2024%2F12%2Fbytecodellm-header.png&size=1&version=1738652774&sig=cdc0e78ce6b3cca73b73817f9bbfac06&default=)

ByteCodeLLM – Privacy in the LLM Era: Byte Code to Source Code

#### xml encoding="UTF-8" TL;DR ByteCodeLLM is a new open-source tool that harnesses the power of Local Large Language Models (LLMs) to decompile Python executables. Furthermore, and importantly, it prioritizes data...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/bytecodellm-privacy-in-the-llm-era-byte-code-to-source-code)

![White FAANG: Devouring Your  Personal Data](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2024%2F11%2Fdevouring-your-personal-data-1.png&size=1&version=1765318223&sig=3b18fdf0427b4e04120535f125425803&default=)

White FAANG: Devouring Your Personal Data

#### xml encoding="UTF-8" Generated using Ideogram Abstract Privacy is a core aspect of our lives. We have the fundamental right to control our personal data, physically or virtually. However, as we use products from...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/white-faang-devouring-your-personal-data)

![Discovering Hidden Vulnerabilities in Portainer with CodeQL](https://content.cdntwrk.com/mediaproxy?url=https%3A%2F%2Fwww.cyberark.com%2Fwp-content%2Fuploads%2F2024%2F10%2Fhidden-vulnerabilities-codeql.png&size=1&version=1765318223&sig=af4e3d4b84a73783e71a726b54b99d95&default=)

Discovering Hidden Vulnerabilities in Portainer with CodeQL

#### xml encoding="UTF-8" Recently, we researched a project on Portainer, the go-to open-source tool for managing Kubernetes and Docker environments. With more than 30K stars on GitHub, Portainer gives you a user-friendly...

[Read Blog](https://www.cyberark.com/resources/threat-research-blog/discovering-hidden-vulnerabilities-in-portainer-with-codeql)

[Return to Home](https://www.cyberark.com/resources)

© CyberArk Software Inc

×
Streams

* Products & Services

  + [Cloud Security](https://www.cyberark.com/resources/cloud-security)
  + [Customer Access](https://www.cyberark.com/resources/customer-access)
  + [Endpoint Privilege Manager](https://www.cyberark.com/resources/endpoint-privilege-security)
  + [Identity Management](https://www.cyberark.com/resources/identity-management)
  + [Privileged Access Management](https://www.cyberark.com/resources/privileged-access-management)
  + [Modern IGA](https://www.cyberark.com/resources/modern-iga)
  + [Secrets Management](https://www.cyberark.com/resources/secrets-management)
  + [Services & Support​](https://www.cyberark.com/resources/services-support)
  + [Shared Services](https://www.cyberark.com/resources/shared-services)
  + [Workforce Access](https://www.cyberark.com/resources/workforce-access)
  + [Machine Identity](https://www.cyberark.com/resources/machine-identity)
* Topics

  + [Agentic AI Security](https://www.cyberark.com/resources/agentic-ai-security)
  + [Access Management](https://www.cyberark.com/resources/access-management)
  + [Best Practices](https://www.cyberark.com/resources/best-practices)
  + [DevSecOps](https://www.cyberark.com/resources/devsecops)
  + [Endpoint Security](https://www.cyberark.com/resources/endpoint-security)
  + [Machine Identity Security](https://www.cyberark.com/resources/machine-identity-security)
  + [Identity Security](https://www.cyberark.com/resources/identity-security)
  + [Identity Governance & Administration](https://www.cyberark.com/resources/identity-governance-administration)
  + [Hybrid and Multi-Cloud Security](https://www.cyberark.com/resources/hybrid-and-multi-cloud-security)
  + [IT Security Audit and Compliance](https://www.cyberark.com/resources/it-security-audit-and-compliance)
  + [Least Privilege](https://www.cyberark.com/resources/least-privilege)
  + [Partners](https://www.cyberark.com/resources/partners)
  + [Ransomware Protection](https://www.cyberark.com/resources/ransomware-protection)
  + [Remote Access](https://www.cyberark.com/resources/remote-access)
  + [Robotic Process Automation](https://www.cyberark.com/resources/robotic-process-automation)
  + [Threat Research​](https://www.cyberark.com/resources/threat-research)
  + [Zero Trust](https://www.cyberark.com/resources/zero-trust)
* Industry

  + [Federal](https://www.cyberark.com/resources/federal)
  + [Financial Services](https://www.cyberark.com/resources/financial-services)
  + [Healthcare​](https://www.cyberark.com/resources/healthcare)
  + [Higher Education](https://www.cyberark.com/resources/higher-education)
  + [Insurance](https://www.cyberark.com/resources/insurance)
  + [Manufacturing](https://www.cyberark.com/resources/manufacturing)
* Content Type

  + [Analyst Reports](https://www.cyberark.com/resources/analyst-reports)
  + [Blog Articles](https://www.cyberark.com/resources/all-blog-posts)
  + [Customer Stories](https://www.cyberark.com/customer-stories/)
  + [eBooks​](https://www.cyberark.com/resources/ebooks)
  + [Executive Insights](https://www.cyberark.com/resources/executive-insights)
  + [Infographics​](https://www.cyberark.com/resources/infographics)
  + [Podcasts](https://www.cyberark.com/podcasts/)
  + [Product Announcements](https://www.cyberark.com/resources/product-announcements)
  + [Product Datasheets​](https://www.cyberark.com/resources/product-datasheets)
  + [Solution Briefs​](https://www.cyberark.com/resources/solution-briefs)
  + [Tools & Blueprints](https://www.cyberark.com/resources/tools-blueprints)
  + [Webinars](https://www.cyberark.com/resources/webinars)
  + [Videos](https://www.cyberark.com/resources/videos)
  + [Whitepapers​](https://www.cyberark.com/resources/white-papers)

![loading](https://content.cdntwrk.com/img/hubs/ajax-loader-white-2x.gif?v=19a554b579c4)

* Share this Hub
* [Facebook](https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.cyberark.com%2Fresources)
* [Twitter](https://twitter.com/share?text=Check%20out%20what%27s%20happening%20at%20CyberArk%21&url=https%3A%2F%2Fwww.cyberark.com%2Fresources&via=CyberArk)
* [Email](/cdn-cgi/l/email-protection#f5ca8680979f909681c8b09b92999c869dd0c7c5d0b0c7d0cdc5d0ccc6d0c7c5b68c979087b4879ed0c7c5a69a938182948790d0c7c5bc9b96d0c7c286d0c7c5bd8097d0c7c59d9486d0c7c59790909bd0c7c5869d94879091d0c7c5829c819dd0c7c58c9a80d3949885ce979a918cc8b69d90969ed0c7c59a8081d0c7c5829d9481d0c7c286d0c7c59d948585909b9c9b92d0c7c59481d0c7c5b68c979087b4879ed0c7c4d0c5b4d0c5b49d81818586d0c6b4d0c7b3d0c7b3828282db968c97908794879edb969a98d0c7b38790869a8087969086)
* [LinkedIn](https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fwww.cyberark.com%2Fresources&title=English%20%E2%80%93%20CyberArk%20Software%20Inc%27s&summary=Check%20out%20what%27s%20happening%20at%20CyberArk%21)

×

* #### STAY IN TOUCH

  Keep up to date on security best practices, events and webinars.

  [Tell Me How](https://lp.cyberark.com/Stay-in-touch.html)

* Support
* [Contact Support](https://www.cyberark.com/services-support/technical-support-contact/)
* [Training & Certification](https://www.cyberark.com/services-support/training/)
* [CyberArk Community![external link](https://www.cyberark.com/wp-content/uploads/2021/01/External-darkblue.svg)](https://community.cyberark.com/s/)
* [Technical Support](https://www.cyberark.com/services-support/technical-support/)
* [EPM SaaS Register / Login](https://www.cyberark.com/products/endpoint-privilege-manager/login/)
* [Product Security](https://www.cyberark.com/product-security/)

* Resources
* [Resource Center](https://www.cyberark.com/resources)
* [Events](https://www.cyberark.com/events/)
* [Blogs](https://www.cyberark.com/resources/all-blog-posts)
* [CIO Connection](https://www.cyberark.com/cio-connection/)
* [CyberArk Blueprint](https://www.cyberark.com/blueprint/)
* [Scan Your Network](https://www.cyberark.com/discovery-audit/)
* [Marketplace![external icon](https://www.cyberark.com/wp-content/uploads/2021/01/External-darkblue.svg)](https://community.cyberark.com/marketplace/s/)

* Partners
* [Partner Network](https://www.cyberark.com/partners/partner-network/)
* [Partner Community![external link](https://www.cyberark.com/wp-content/uploads/2021/01/External-darkblue.svg)](https://community.cyberark.com/partners/s/login/)
* [Partner Finder](https://www.cyberark.com/partner-finder/)
* [Become a Partner](https://www.cyberark.com/partners/become-a-partner/)
* [Alliance Partner](https://www.cyberark.com/partners/alliance-partners/)

* Company
* [Investor Relations ![external link](https://www.cyberark.com/wp-content/uploads/2021/01/External-darkblue.svg)](https://investors.cyberark.com/home/default.aspx)
* [Leadership](https://www.cyberark.com/company/leadership/)
* [Board of Directors](https://www.cyberark.com/company/leadership/#directors)
* [Newsroom](https://www.cyberark.com/company/newsroom/)
* [Office Locations](https://www.cyberark.com/company/office-locations/)
* [Environmental, Social and Governance](https://www.cyberark.com/company/esg/)
* [Trust Center](https://www.cyberark.com/trust/)
* [Careers – We’re Hiring!](https://careers.cyberark.com/)

![CyberArk Logo](https://www.cyberark.com/wp-content/uploads/2024/10/cyberark-logo-tagline.svg)

Copyright ©  CyberArk Software Ltd.
All rights reserved.

* [*Linkedin*](https://www.linkedin.com/company/cyber-ark-software)
* [*Blog*](https://www.cyberark.com/resources/blog)
* [*Youtube*](https://www.youtube.com/user/cyberarksoftware)

* [Terms and Conditions](https://www.cyberark.com/terms-conditions/)
* [Privacy Policy](https://www.cyberark.com/privacy-notice/)
