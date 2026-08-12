namespace Reporting;

/// <summary>
/// Retrieval of upstream reports.
///
/// Intentionally vulnerable, see cases/ssrf-crossfile.
/// </summary>
public class UpstreamClient
{
    private readonly HttpClient _httpClient;

    public UpstreamClient(HttpClient httpClient) => _httpClient = httpClient;

    /// <summary>
    /// Fetch an upstream report with no validation whatsoever.
    ///
    /// The URL arrives from a controller in another file, so an attacker chooses the host.
    /// </summary>
    public async Task<string> FetchAsync(string target)
    {
        // VULN: the target is attacker controlled and reaches the request unmodified.
        using HttpResponseMessage response = await _httpClient.GetAsync(target);

        return await response.Content.ReadAsStringAsync();
    }
}
