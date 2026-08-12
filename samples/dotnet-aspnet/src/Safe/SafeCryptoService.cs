using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Reporting.Safe;

/// <summary>
/// Correct counterpart of CryptoService.
///
/// Same class shape, same methods, same call sequence.
/// The connection string comes from configuration and the digest is SHA-256.
///
/// Any finding reported in this file is a false positive.
/// </summary>
public class SafeCryptoService
{
    private readonly string _connectionString;

    public SafeCryptoService(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Reporting") ?? string.Empty;
    }

    public string GetConnectionString() => _connectionString;

    public string Fingerprint(string payload)
    {
        using var sha = SHA256.Create();

        byte[] digest = sha.ComputeHash(Encoding.UTF8.GetBytes(payload));

        return Convert.ToHexString(digest);
    }
}
