---
title: "Smithery API: Publish a server"
source_url: "https://smithery.ai/docs/api-reference/servers/publish-a-server"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["smithery", "mcp-directory", "mcpb", "api", "submission"]
summary: "Smitheryへmultipart formでMCPBとJSON release payloadを送る公式API仕様。"
relevance: "Smithery CLI 1.2.0のMCPB metadata変換不整合を回避し、公式APIでstdio releaseを公開する根拠。"
chars: 17281
---

> ## Documentation Index
>
> Fetch the complete documentation index at: </docs/llms.txt>
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](#content-area)

[Smithery Documentation home page![light logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)![dark logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)](https://smithery.ai)

Search...

⌘K

### Welcome

* [Introduction](/docs)

### Connect

* [Connect to MCPs](/docs/use/connect)
* [Uplink](/docs/use/uplink)
* [Token Scoping](/docs/use/token-scoping)
* [Deep Linking](/docs/use/deep-linking)
* [Listing Your Client](/docs/use/listing_your_client)

### Publish

* [Overview](/docs/build)
* [Publish](/docs/build/publish)
* [Triggers](/docs/build/triggers)

### Integrations

* [Vercel AI SDK Integration](/docs/integrations/vercel_ai_sdk)

### Concepts

* [What is MCP?](/docs/concepts/what_is_mcp)
* [Namespaces](/docs/concepts/namespaces)
* [Smithery CLI](/docs/concepts/cli)

### Cookbooks

* [Build an OAuth-compatible client](/docs/cookbooks/typescript_oauth_client)

### API Reference

* API Reference
* servers

  + [GET

    Get a server](/docs/api-reference/servers/get-a-server)
  + [PUT

    Create a server](/docs/api-reference/servers/create-a-server)
  + [DEL

    Delete a server](/docs/api-reference/servers/delete-a-server)
  + [PATCH

    Update a server](/docs/api-reference/servers/update-a-server)
  + [POST

    Transfer a server](/docs/api-reference/servers/transfer-a-server)
  + [GET

    Download server bundle](/docs/api-reference/servers/download-server-bundle)
  + [GET

    List releases](/docs/api-reference/servers/list-releases)
  + [PUT

    Publish a server](/docs/api-reference/servers/publish-a-server)
  + [GET

    Get a release](/docs/api-reference/servers/get-a-release)
  + [GET

    Stream release logs](/docs/api-reference/servers/stream-release-logs)
  + [POST

    Resume a release](/docs/api-reference/servers/resume-a-release)
  + [GET

    List runtime logs](/docs/api-reference/servers/list-runtime-logs)
  + [GET

    Get server icon](/docs/api-reference/servers/get-server-icon)
  + [PUT

    Upload server icon](/docs/api-reference/servers/upload-server-icon)
  + [DEL

    Delete server icon](/docs/api-reference/servers/delete-server-icon)
  + [GET

    Infer a tool output schema](/docs/api-reference/servers/infer-a-tool-output-schema)
  + [GET

    List all servers](/docs/api-reference/servers/list-all-servers)
* skills
* tokens
* namespaces
* organizations
* connect

* Support
* [Discord](https://discord.gg/Afd38S5p9A)

[Smithery Documentation home page![light logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)![dark logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)](https://smithery.ai)

Search...

⌘KAsk Assistant

* Support
* [Discord](https://discord.gg/Afd38S5p9A)
* [Discord](https://discord.gg/Afd38S5p9A)

Search...

Navigation

servers

Publish a server

servers

# Publish a server

Copy pageCopy page

Submit a release via multipart form. Supports hosted (JS module upload), external (URL), and stdio (MCPB bundle) release types.

Copy pageCopy page

PUT

/

servers

/

{qualifiedName}

/

releases

Try it

JavaScript

JavaScript

```
import fs from 'fs';
import Smithery from '@smithery/api';

const client = new Smithery({
  apiKey: process.env['SMITHERY_API_KEY'], // This is the default and can be omitted
});

const response = await client.servers.releases.deploy('qualifiedName', { payload: 'payload' });

console.log(response.deploymentId);
```

```
curl --request PUT \
  --url https://api.smithery.ai/servers/{qualifiedName}/releases \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: multipart/form-data' \
  --form 'payload=<string>' \
  --form module='@example-file' \
  --form sourcemap='@example-file' \
  --form bundle='@example-file'
```

```
import requests

url = "https://api.smithery.ai/servers/{qualifiedName}/releases"

files = {
    "module": ("example-file", open("example-file", "rb")),
    "sourcemap": ("example-file", open("example-file", "rb")),
    "bundle": ("example-file", open("example-file", "rb"))
}
payload = { "payload": "<string>" }
headers = {"Authorization": "Bearer <token>"}

response = requests.put(url, data=payload, files=files, headers=headers)

print(response.text)
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.smithery.ai/servers/{qualifiedName}/releases",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "PUT",
  CURLOPT_POSTFIELDS => "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--",
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer <token>",
    "Content-Type: multipart/form-data; boundary=---011000010111000001101001"
  ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
```

```
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.smithery.ai/servers/{qualifiedName}/releases"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--")

	req, _ := http.NewRequest("PUT", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(string(body))

}
```

```
HttpResponse<String> response = Unirest.put("https://api.smithery.ai/servers/{qualifiedName}/releases")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.smithery.ai/servers/{qualifiedName}/releases")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Put.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--"

response = http.request(request)
puts response.read_body
```

202

400

```
{
  "deploymentId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "WORKING",
  "mcpUrl": "https://slug.run.tools",
  "warnings": [
    "<string>"
  ]
}
```

```
{
  "error": "Server not found"
}
```

#### Authorizations

[​](#authorization-authorization)

Authorization

string

header

required

Smithery API key as Bearer token

#### Path Parameters

[​](#parameter-qualified-name)

qualifiedName

string

required

The server's qualified name (e.g. 'namespace/server' or 'namespace' for namespace-only servers). Use %2F to encode the slash.

#### Body

multipart/form-data

[​](#body-payload)

payload

string

required

JSON-encoded release payload. See DeployPayload schema for structure.

[​](#body-module)

module

file

JavaScript module file (for hosted releases)

[​](#body-sourcemap)

sourcemap

file

Source map file (for hosted releases)

[​](#body-bundle)

bundle

file

MCPB bundle file (for stdio releases)

#### Response

202

application/json

Release accepted

[​](#response-deployment-id)

deploymentId

string<uuid>

required

Unique identifier for this release.

Pattern: `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$`

Example:

`"123e4567-e89b-12d3-a456-426614174000"`

[​](#response-status)

status

string

required

Initial status. Will be WORKING while the release is in progress.

Example:

`"WORKING"`

[​](#response-mcp-url)

mcpUrl

string<uri>

required

The MCP endpoint URL for connecting to this server once published.

Example:

`"https://slug.run.tools"`

[​](#response-warnings)

warnings

string[]

Non-fatal warnings encountered during submission.

Was this page helpful?

YesNo

[Previous](/docs/api-reference/servers/list-releases)[Get a releaseRetrieve release details including status, git metadata, pipeline logs, and MCP endpoint URL.

Next](/docs/api-reference/servers/get-a-release)

⌘I

[github](https://github.com/smithery-ai)[twitter](https://twitter.com/SmitheryDotAI)[discord](https://discord.gg/Afd38S5p9A)

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=smithery)

JavaScript

JavaScript

```
import fs from 'fs';
import Smithery from '@smithery/api';

const client = new Smithery({
  apiKey: process.env['SMITHERY_API_KEY'], // This is the default and can be omitted
});

const response = await client.servers.releases.deploy('qualifiedName', { payload: 'payload' });

console.log(response.deploymentId);
```

```
curl --request PUT \
  --url https://api.smithery.ai/servers/{qualifiedName}/releases \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: multipart/form-data' \
  --form 'payload=<string>' \
  --form module='@example-file' \
  --form sourcemap='@example-file' \
  --form bundle='@example-file'
```

```
import requests

url = "https://api.smithery.ai/servers/{qualifiedName}/releases"

files = {
    "module": ("example-file", open("example-file", "rb")),
    "sourcemap": ("example-file", open("example-file", "rb")),
    "bundle": ("example-file", open("example-file", "rb"))
}
payload = { "payload": "<string>" }
headers = {"Authorization": "Bearer <token>"}

response = requests.put(url, data=payload, files=files, headers=headers)

print(response.text)
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.smithery.ai/servers/{qualifiedName}/releases",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "PUT",
  CURLOPT_POSTFIELDS => "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--",
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer <token>",
    "Content-Type: multipart/form-data; boundary=---011000010111000001101001"
  ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
```

```
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.smithery.ai/servers/{qualifiedName}/releases"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--")

	req, _ := http.NewRequest("PUT", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(string(body))

}
```

```
HttpResponse<String> response = Unirest.put("https://api.smithery.ai/servers/{qualifiedName}/releases")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.smithery.ai/servers/{qualifiedName}/releases")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Put.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"module\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"sourcemap\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"bundle\"; filename=\"example-file\"\r\nContent-Type: application/octet-stream\r\n\r\n<string>\r\n-----011000010111000001101001--"

response = http.request(request)
puts response.read_body
```

202

400

```
{
  "deploymentId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "WORKING",
  "mcpUrl": "https://slug.run.tools",
  "warnings": [
    "<string>"
  ]
}
```

```
{
  "error": "Server not found"
}
```

Assistant

Responses are generated using AI and may contain mistakes.
