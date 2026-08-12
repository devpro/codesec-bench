# ssrf-crossfile

**CWE-918, difficulty 4, cross-file.**

This is the same defect as [php-symfony/ssrf-crossfile](../../../php-symfony/cases/ssrf-crossfile/) and [typescript-express/ssrf-crossfile](../../../typescript-express/cases/ssrf-crossfile/), planted a third time.

## The defect

```java
// ReportController.java:36
public String upstream(@RequestParam String url) throws Exception {
    return upstreamClient.fetch(url);
}

// UpstreamClient.java:34
.uri(URI.create(target))
```

An attacker chooses the host.
Pointing it at `http://169.254.169.254/` returns cloud instance credentials from inside the network boundary.

## Why the same case appears three times

Because one measurement is an anecdote and three are a result.

The PHP miss could be blamed on weak PHP tool support.
The TypeScript miss removed that explanation, and this one removes the remaining doubt: **Java has the most mature free security tooling of any language here**, and the flow is missed at both the source and the sink.

Ecosystem      | Tool maturity | ssrf-source | ssrf-sink
---------------|---------------|-------------|----------
php-symfony    | Weak          | no          | no
typescript-express | Strong    | no          | no
java-spring    | Strongest     | no          | no

Level 4 is a property of the analysis, not of the ecosystem.
Cross-file taint tracking is the boundary between the free and the commercial tier, and no amount of rule writing crosses it, because the rules are not the limitation.

## The safe counterpart

`safe/SafeUpstreamClient.java` parses the URL and compares `getHost()` for equality against an allowlist.
`safe/SafeReportController.java` binds the same parameters in the same way.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
