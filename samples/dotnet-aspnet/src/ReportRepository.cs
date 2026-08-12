using Microsoft.Data.SqlClient;

namespace Reporting;

/// <summary>
/// Report lookup over ADO.NET.
///
/// Intentionally vulnerable, see cases/sql-injection-concat.
/// </summary>
public class ReportRepository
{
    private readonly CryptoService _crypto;

    public ReportRepository(CryptoService crypto) => _crypto = crypto;

    /// <summary>
    /// Return every report belonging to an owner.
    ///
    /// The owner name arrives from a request parameter and is concatenated into the statement.
    /// </summary>
    public async Task<List<string>> FindByOwnerAsync(string owner)
    {
        var titles = new List<string>();

        await using var connection = new SqlConnection(_crypto.GetConnectionString());
        await connection.OpenAsync();

        // VULN: a quote in owner ends the literal and the remainder executes as SQL.
        string sql = "SELECT title FROM reports WHERE owner = '" + owner + "'";
        await using var command = new SqlCommand(sql, connection);

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            titles.Add(reader.GetString(0));
        }

        return titles;
    }
}
