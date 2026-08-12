namespace Reporting.Safe;

/// <summary>
/// Correct counterpart of UpstreamClient.
///
/// Same client, same call, same method name.
/// The URL is parsed and its host compared for equality against an allowlist.
///
/// Any finding reported in this file is a false positive.
/// </summary>
public class SafeUpstreamClient
{
    private static readonly HashSet<string> AllowedHosts =
    [
        "reports.internal",
        "metrics.internal",
    ];

    private readonly HttpClient _httpClient;

    public SafeUpstreamClient(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<string> FetchAsync(string target)
    {
        if (!Uri.TryCreate(target, UriKind.Absolute, out Uri? uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !AllowedHosts.Contains(uri.Host))
        {
            throw new ArgumentException("Upstream host is not allowed");
        }

        using HttpResponseMessage response = await _httpClient.GetAsync(uri);

        return await response.Content.ReadAsStringAsync();
    }
}
