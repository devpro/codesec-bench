# sensitive-data-in-logs

**CWE-532 and CWE-209, difficulty 2, intra-procedural.**

## The defect

The outgoing request carries two secrets in its headers:

```php
'header-key'    => $apiKey,
'authorization' => 'Bearer ' . $this->getToken(),
```

When it fails, the raw exception message is logged and then wrapped into an exception that reaches the caller:

```php
// src/Service/ApiClient.php:56
$this->logger->error(
    sprintf('API response error on %s: %s', $endpoint, $e->getMessage())
);

// src/Service/ApiClient.php:60
throw new ApiException(
    sprintf('API response error on %s: %s', $endpoint, $e->getMessage())
);
```

Symfony HTTP client exception messages embed the request URL and, on several failure modes, header detail.
The first statement writes that to the log file, the second returns it in the JSON error body built by the controller.

## Why it is level 2

Both statements are visible within a single method, with no call graph to follow.
A rule matching a logger call on an exception message finds the first one with no dataflow at all.

This case is the calibration point between the trivial and the hard end of the sample.
A tool that misses `log-leak` is not doing security analysis.

`rethrow-leak` is slightly harder: recognising that a wrapped exception message escapes to an HTTP response requires knowing what the controller does with `ApiException`.

## The safe counterpart

`src/Safe/SafeApiClient.php` logs the exception class rather than its message, and returns a fixed string that carries no upstream detail:

```php
$this->logger->error(sprintf('API transport failure on %s: %s', $endpoint, $e::class));
throw new ApiException('Upstream API is unreachable');
```

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
