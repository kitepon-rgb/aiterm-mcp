---
title: "Smithery API: Update a server"
source_url: "https://smithery.ai/docs/api-reference/servers/update-a-server"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["smithery", "mcp-directory", "metadata", "api"]
summary: "SmitheryのdisplayName・description・repository・icon・visibilityを更新する公式API仕様。"
relevance: "aiterm-mcp公開ページの訴求、リポジトリ導線、MITライセンス、アイコンを正規APIで設定する根拠。"
chars: 13461
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

Update a server

servers

# Update a server

Copy pageCopy page

Update server metadata such as display name, description, repository, icon, or visibility.

Copy pageCopy page

PATCH

/

servers

/

{qualifiedName}

Try it

JavaScript

JavaScript

```
import Smithery from '@smithery/api';

const client = new Smithery({
  apiKey: process.env['SMITHERY_API_KEY'], // This is the default and can be omitted
});

const server = await client.servers.update('qualifiedName');

console.log(server.namespace);
```

```
curl --request PATCH \
  --url https://api.smithery.ai/servers/{qualifiedName} \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "displayName": "<string>",
  "description": "<string>",
  "homepage": "<string>",
  "repositoryUrl": "<string>",
  "backlinkUrl": "<string>",
  "license": "<string>",
  "iconUrl": "<string>",
  "unlisted": true
}
'
```

```
import requests

url = "https://api.smithery.ai/servers/{qualifiedName}"

payload = {
    "displayName": "<string>",
    "description": "<string>",
    "homepage": "<string>",
    "repositoryUrl": "<string>",
    "backlinkUrl": "<string>",
    "license": "<string>",
    "iconUrl": "<string>",
    "unlisted": True
}
headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.patch(url, json=payload, headers=headers)

print(response.text)
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.smithery.ai/servers/{qualifiedName}",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "PATCH",
  CURLOPT_POSTFIELDS => json_encode([
    'displayName' => '<string>',
    'description' => '<string>',
    'homepage' => '<string>',
    'repositoryUrl' => '<string>',
    'backlinkUrl' => '<string>',
    'license' => '<string>',
    'iconUrl' => '<string>',
    'unlisted' => true
  ]),
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer <token>",
    "Content-Type: application/json"
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

	url := "https://api.smithery.ai/servers/{qualifiedName}"

	payload := strings.NewReader("{\n  \"displayName\": \"<string>\",\n  \"description\": \"<string>\",\n  \"homepage\": \"<string>\",\n  \"repositoryUrl\": \"<string>\",\n  \"backlinkUrl\": \"<string>\",\n  \"license\": \"<string>\",\n  \"iconUrl\": \"<string>\",\n  \"unlisted\": true\n}")

	req, _ := http.NewRequest("PATCH", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(string(body))

}
```

```
HttpResponse<String> response = Unirest.patch("https://api.smithery.ai/servers/{qualifiedName}")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"displayName\": \"<string>\",\n  \"description\": \"<string>\",\n  \"homepage\": \"<string>\",\n  \"repositoryUrl\": \"<string>\",\n  \"backlinkUrl\": \"<string>\",\n  \"license\": \"<string>\",\n  \"iconUrl\": \"<string>\",\n  \"unlisted\": true\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.smithery.ai/servers/{qualifiedName}")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"displayName\": \"<string>\",\n  \"description\": \"<string>\",\n  \"homepage\": \"<string>\",\n  \"repositoryUrl\": \"<string>\",\n  \"backlinkUrl\": \"<string>\",\n  \"license\": \"<string>\",\n  \"iconUrl\": \"<string>\",\n  \"unlisted\": true\n}"

response = http.request(request)
puts response.read_body
```

200

400

403

404

```
{
  "success": true,
  "namespace": "<string>",
  "server": "<string>"
}
```

```
{
  "error": "Server not found"
}
```

```
{
  "error": "Server not found"
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

application/json

[​](#body-display-name)

displayName

string

[​](#body-description)

description

string

[​](#body-homepage-one-of-0)

homepage

string | null

[​](#body-repository-url-one-of-0)

repositoryUrl

string | null

[​](#body-backlink-url-one-of-0)

backlinkUrl

string | null

[​](#body-license-one-of-0)

license

string | null

[​](#body-icon-url-one-of-0)

iconUrl

string | null

[​](#body-unlisted)

unlisted

boolean

#### Response

200

application/json

Server updated

[​](#response-success)

success

boolean

required

[​](#response-namespace)

namespace

string

required

[​](#response-server)

server

string

required

Was this page helpful?

YesNo

[Previous](/docs/api-reference/servers/delete-a-server)[Transfer a serverMove a server to another namespace. The caller must have server write access to both the source namespace and the destination namespace.

Next](/docs/api-reference/servers/transfer-a-server)

⌘I

[github](https://github.com/smithery-ai)[twitter](https://twitter.com/SmitheryDotAI)[discord](https://discord.gg/Afd38S5p9A)

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=smithery)

JavaScript

JavaScript

```
import Smithery from '@smithery/api';

const client = new Smithery({
  apiKey: process.env['SMITHERY_API_KEY'], // This is the default and can be omitted
});

const server = await client.servers.update('qualifiedName');

console.log(server.namespace);
```

```
curl --request PATCH \
  --url https://api.smithery.ai/servers/{qualifiedName} \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "displayName": "<string>",
  "description": "<string>",
  "homepage": "<string>",
  "repositoryUrl": "<string>",
  "backlinkUrl": "<string>",
  "license": "<string>",
  "iconUrl": "<string>",
  "unlisted": true
}
'
```

```
import requests

url = "https://api.smithery.ai/servers/{qualifiedName}"

payload = {
    "displayName": "<string>",
    "description": "<string>",
    "homepage": "<string>",
    "repositoryUrl": "<string>",
    "backlinkUrl": "<string>",
    "license": "<string>",
    "iconUrl": "<string>",
    "unlisted": True
}
headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.patch(url, json=payload, headers=headers)

print(response.text)
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.smithery.ai/servers/{qualifiedName}",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "PATCH",
  CURLOPT_POSTFIELDS => json_encode([
    'displayName' => '<string>',
    'description' => '<string>',
    'homepage' => '<string>',
    'repositoryUrl' => '<string>',
    'backlinkUrl' => '<string>',
    'license' => '<string>',
    'iconUrl' => '<string>',
    'unlisted' => true
  ]),
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer <token>",
    "Content-Type: application/json"
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

	url := "https://api.smithery.ai/servers/{qualifiedName}"

	payload := strings.NewReader("{\n  \"displayName\": \"<string>\",\n  \"description\": \"<string>\",\n  \"homepage\": \"<string>\",\n  \"repositoryUrl\": \"<string>\",\n  \"backlinkUrl\": \"<string>\",\n  \"license\": \"<string>\",\n  \"iconUrl\": \"<string>\",\n  \"unlisted\": true\n}")

	req, _ := http.NewRequest("PATCH", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(string(body))

}
```

```
HttpResponse<String> response = Unirest.patch("https://api.smithery.ai/servers/{qualifiedName}")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"displayName\": \"<string>\",\n  \"description\": \"<string>\",\n  \"homepage\": \"<string>\",\n  \"repositoryUrl\": \"<string>\",\n  \"backlinkUrl\": \"<string>\",\n  \"license\": \"<string>\",\n  \"iconUrl\": \"<string>\",\n  \"unlisted\": true\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.smithery.ai/servers/{qualifiedName}")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"displayName\": \"<string>\",\n  \"description\": \"<string>\",\n  \"homepage\": \"<string>\",\n  \"repositoryUrl\": \"<string>\",\n  \"backlinkUrl\": \"<string>\",\n  \"license\": \"<string>\",\n  \"iconUrl\": \"<string>\",\n  \"unlisted\": true\n}"

response = http.request(request)
puts response.read_body
```

200

400

403

404

```
{
  "success": true,
  "namespace": "<string>",
  "server": "<string>"
}
```

```
{
  "error": "Server not found"
}
```

```
{
  "error": "Server not found"
}
```

```
{
  "error": "Server not found"
}
```

Assistant

Responses are generated using AI and may contain mistakes.
