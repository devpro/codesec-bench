package com.example.reporting;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP entry point for the reporting service.
 *
 * Every handler here is a taint source.
 * The defects live in the services these handlers call, which is what makes the flows cross-file.
 */
@RestController
public class ReportController {

    private final ReportRepository repository;
    private final UpstreamClient upstreamClient;
    private final XmlIngestService xmlIngestService;

    public ReportController(
            ReportRepository repository, UpstreamClient upstreamClient, XmlIngestService xmlIngestService) {
        this.repository = repository;
        this.upstreamClient = upstreamClient;
        this.xmlIngestService = xmlIngestService;
    }

    @GetMapping("/reports")
    public List<String> listReports(@RequestParam String owner) throws Exception {
        return repository.findByOwner(owner);
    }

    @GetMapping("/upstream")
    public String upstream(@RequestParam String url) throws Exception {
        return upstreamClient.fetch(url);
    }

    @GetMapping("/upstream/guarded")
    public String upstreamGuarded(@RequestParam String url) throws Exception {
        return upstreamClient.fetchGuarded(url);
    }

    @PostMapping("/ingest")
    public String ingest(@RequestBody String xml) throws Exception {
        return xmlIngestService.ingest(xml);
    }
}
