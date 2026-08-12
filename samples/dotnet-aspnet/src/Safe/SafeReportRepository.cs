using Microsoft.Data.SqlClient;

namespace Reporting.Safe;

/// <summary>
/// Correct counterpart of ReportRepository.
///
/// Same provider, same query, same names.
/// The owner is bound as a parameter rather than concatenated into the statement.
///
/// Any finding reported in this file is a false positive.
/// </summary>
public class SafeReportRepository
{
    private readonly SafeCryptoService _crypto;

    public SafeReportRepository(SafeCryptoService crypto) => _crypto = crypto;

    public async Task<List<string>> FindByOwnerAsync(string owner)
    {
        var titles = new List<string>();

        await using var connection = new SqlConnection(_crypto.GetConnectionString());
        await connection.OpenAsync();

        const string sql = "SELECT title FROM reports WHERE owner = @owner";
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@owner", owner);

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            titles.Add(reader.GetString(0));
        }

        return titles;
    }
}
