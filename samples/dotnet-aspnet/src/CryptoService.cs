using System.Security.Cryptography;
using System.Text;

namespace Reporting;

/// <summary>
/// Credential and payload protection for the reporting service.
///
/// Intentionally vulnerable, see cases/weak-crypto-and-secret.
/// </summary>
public class CryptoService
{
    // VULN: the connection string carries a plaintext password and is a source literal.
    private const string ConnectionString =
        "Server=reporting-db.internal;Database=reports;User Id=reporting_app;Password=Pr0d-Reporting-2024;";

    public string GetConnectionString() => ConnectionString;

    /// <summary>
    /// Fingerprint a report payload.
    ///
    /// MD5 is collision broken, so two different payloads can be made to share a fingerprint,
    /// which defeats the integrity check this value is used for.
    /// </summary>
    public string Fingerprint(string payload)
    {
        // VULN: a broken hash used where collision resistance is required.
        using var md5 = MD5.Create();

        byte[] digest = md5.ComputeHash(Encoding.UTF8.GetBytes(payload));

        return Convert.ToHexString(digest);
    }
}
