package com.example.reporting.safe;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Correct counterpart of ReportController.
 *
 * The same handlers read the same request parameters and call the same method names on the safe services.
 * The taint sources are identical, so a tool reacting to the source rather than to a reachable sink shows
 * up here as a false positive.
 *
 * Any finding reported in this file is a false positive.
 */
@RestController
public class SafeReportController {

    private final SafeReportRepository repository;
    private final SafeUpstreamClient upstreamClient;
    private final SafeXmlIngestService xmlIngestService;

    public SafeReportController(
            SafeReportRepository repository,
            SafeUpstreamClient upstreamClient,
            SafeXmlIngestService xmlIngestService) {
        this.repository = repository;
        this.upstreamClient = upstreamClient;
        this.xmlIngestService = xmlIngestService;
    }

    @GetMapping("/safe/reports")
    public List<String> listReports(@RequestParam String owner) throws Exception {
        return repository.findByOwner(owner);
    }

    @GetMapping("/safe/upstream")
    public String upstream(@RequestParam String url) throws Exception {
        return upstreamClient.fetch(url);
    }

    @PostMapping("/safe/ingest")
    public String ingest(@RequestBody String xml) throws Exception {
        return xmlIngestService.ingest(xml);
    }
}
