package com.example.reporting.safe;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Correct counterpart of UpstreamClient.
 *
 * Same client, same request building, same method names.
 * The URL is parsed and its host compared for equality, so the decision is made on the authority the
 * runtime will actually connect to rather than on the shape of the string.
 *
 * Any finding reported in this file is a false positive.
 */
@Service
public class SafeUpstreamClient {

    private static final Set<String> ALLOWED_HOSTS = Set.of("reports.internal", "metrics.internal");

    private final HttpClient httpClient = HttpClient.newHttpClient();

    private URI requireAllowed(String target) {
        URI uri = URI.create(target);

        if (!"https".equals(uri.getScheme())) {
            throw new IllegalArgumentException("Upstream protocol is not allowed");
        }

        if (uri.getHost() == null || !ALLOWED_HOSTS.contains(uri.getHost())) {
            throw new IllegalArgumentException("Upstream host is not allowed");
        }

        return uri;
    }

    public String fetch(String target) throws Exception {
        HttpRequest request = HttpRequest.newBuilder().uri(requireAllowed(target)).build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }

    public String fetchGuarded(String target) throws Exception {
        HttpRequest request = HttpRequest.newBuilder().uri(requireAllowed(target)).build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
