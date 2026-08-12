namespace Reporting;

/// <summary>
/// Report file access.
///
/// Intentionally vulnerable, see cases/path-guard-startswith.
/// </summary>
public class ReportFileService
{
    private const string ReportsDirectory = "/var/lib/reports";

    /// <summary>
    /// Read a report by name, behind a containment check that does not hold.
    ///
    /// The check compares the resolved path against the base directory with StartsWith, and the base
    /// directory carries no trailing separator. A sibling directory whose name merely begins with the
    /// same characters therefore passes: "/var/lib/reports-public/../../../etc/passwd" resolves to a path
    /// starting with "/var/lib/reports" and is accepted.
    /// </summary>
    public string ReadReport(string name)
    {
        string fullPath = Path.GetFullPath(Path.Combine(ReportsDirectory, name));

        // VULN: no trailing separator, so /var/lib/reports-public also satisfies the prefix.
        if (!fullPath.StartsWith(ReportsDirectory))
        {
            throw new UnauthorizedAccessException("Report name escapes the reports directory");
        }

        return File.ReadAllText(fullPath);
    }
}
