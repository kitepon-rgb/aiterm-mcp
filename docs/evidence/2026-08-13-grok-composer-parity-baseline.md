# Grok／Composer parity変更前baseline

- Date: 2026-08-13
- Base commit: `8974cf314ce055039d5aaa0eb2091320f7e48f94`
- Command: `npm test`
- Result: exit 0、342/342 green
- Duration: 97,249 ms
- stdout artifact SHA-256: `20fcfb27d289d5a762b613bc5cbbe7d527239398f8a2efa1c36b595a658582f0`
- stderr artifact SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

変更前に既存full regressionがgreenであることを確認した。以後のfocused failureは今回のtarget contract、
最終full regressionは受入candidateの回帰として扱う。
