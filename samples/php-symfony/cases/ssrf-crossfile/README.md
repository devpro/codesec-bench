# ssrf-crossfile

**CWE-918, difficulty 4, cross-file taint.**

## The defect

`ApiController::call()` reads `?endpoint=` from the query string and passes it to `ApiClient::call()`, which lives in another file and another namespace.
`ApiClient` concatenates the value onto `BASE_URL` and issues the request.
Nothing between the two validates it.

```php
// src/Controller/ApiController.php:30
$endpoint = $request->query->getString('endpoint', '/get');
$body = $this->apiClient->call($endpoint);

// src/Service/ApiClient.php:45
$response = $this->httpClient->request('GET', $baseUrl . $endpoint, $options);
```

A path such as `/../../` reaches unintended routes on the same host.
Because the request carries an API key and a bearer token in its headers, a value that redirects the request also leaks those credentials to whatever answers.

## Why it is level 4

The sink alone is reachable with a syntactic rule: a concatenation inside an HTTP client call is a visible shape.
Proving it is *exploitable* means following the value from the Symfony `InputBag` in the controller into a method on another class in another file.
That is inter-procedural, cross-file taint analysis.

The two expectations separate these.
`ssrf-sink` is what a good syntactic rule finds.
`ssrf-source` is what only real taint tracking finds.

## The safe counterpart

`src/Safe/SafeApiClient.php` makes the identical request, through the identical client, with the identical variable names.
The only difference is the allowlist checked before the request is built.

A tool that reports the safe file is matching on the concatenation and has not seen the guard above it.
That is precisely what the repository's own custom Semgrep rule does, and it is recorded as a false positive in [the matrix](../../../../docs/matrix.md).

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
At the time of writing, no free tool detects `ssrf-source`.
