using Microsoft.AspNetCore.Mvc;

namespace Reporting.Safe;

/// <summary>
/// Correct counterpart of ReportController.
///
/// The same actions bind the same query parameters and call the same method names on the safe services.
/// The taint sources are identical, so a tool reacting to the source rather than to a reachable sink shows
/// up here as a false positive.
///
/// Any finding reported in this file is a false positive.
/// </summary>
[ApiController]
[Route("/safe")]
public class SafeReportController : ControllerBase
{
    private readonly SafeReportRepository _repository;
    private readonly SafeUpstreamClient _upstreamClient;
    private readonly SafeXmlIngestService _xmlIngestService;
    private readonly SafeReportFileService _fileService;

    public SafeReportController(
        SafeReportRepository repository,
        SafeUpstreamClient upstreamClient,
        SafeXmlIngestService xmlIngestService,
        SafeReportFileService fileService)
    {
        _repository = repository;
        _upstreamClient = upstreamClient;
        _xmlIngestService = xmlIngestService;
        _fileService = fileService;
    }

    [HttpGet("reports")]
    public async Task<List<string>> ListReports([FromQuery] string owner)
    {
        return await _repository.FindByOwnerAsync(owner);
    }

    [HttpGet("upstream")]
    public async Task<string> Upstream([FromQuery] string url)
    {
        return await _upstreamClient.FetchAsync(url);
    }

    [HttpGet("reports/file")]
    public string ReadFile([FromQuery] string name)
    {
        return _fileService.ReadReport(name);
    }

    [HttpPost("ingest")]
    public string Ingest([FromBody] string xml)
    {
        return _xmlIngestService.Ingest(xml);
    }
}
