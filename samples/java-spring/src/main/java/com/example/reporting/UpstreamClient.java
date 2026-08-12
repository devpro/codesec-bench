package com.example.reporting;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Retrieval of upstream reports.
 *
 * Intentionally vulnerable, see cases/ssrf-crossfile and cases/regex-guard-unanchored.
 */
@Service
public class UpstreamClient {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * The intent is clear from the pattern: only the internal reporting host is meant to be reachable.
     * How it is applied below is what breaks it.
     */
    private static final Pattern ALLOWED = Pattern.compile("https://reports\\.internal");

    /**
     * Fetch an upstream report with no validation whatsoever.
     *
     * The URL arrives from a controller in another file, so an attacker chooses the host.
     */
    public String fetch(String target) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                // VULN: the target is attacker controlled and reaches the request unmodified.
                .uri(URI.create(target))
                .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }

    /**
     * Fetch an upstream report behind a guard that does not hold.
     *
     * Matcher.find() searches for the pattern anywhere in the input, while matches() would require it to
     * cover the whole input. The pattern is also unanchored, so any URL that merely contains the allowed
     * host somewhere passes: "https://evil.com/?next=https://reports.internal" is accepted.
     */
    public String fetchGuarded(String target) throws Exception {
        if (!ALLOWED.matcher(target).find()) {
            throw new IllegalArgumentException("Upstream host is not allowed");
        }

        HttpRequest request = HttpRequest.newBuilder()
                // VULN: reachable with any URL that contains the allowed host as a substring.
                .uri(URI.create(target))
                .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
