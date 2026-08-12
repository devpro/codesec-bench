using Microsoft.AspNetCore.Mvc;

namespace Reporting;

/// <summary>
/// HTTP entry point for the reporting service.
///
/// Every action here is a taint source.
/// The defects live in the services these actions call, which is what makes the flows cross-file.
/// </summary>
[ApiController]
[Route("/")]
public class ReportController : ControllerBase
{
    private readonly ReportRepository _repository;
    private readonly UpstreamClient _upstreamClient;
    private readonly XmlIngestService _xmlIngestService;
    private readonly ReportFileService _fileService;

    public ReportController(
        ReportRepository repository,
        UpstreamClient upstreamClient,
        XmlIngestService xmlIngestService,
        ReportFileService fileService)
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
