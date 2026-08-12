namespace Reporting.Safe;

/// <summary>
/// Correct counterpart of ReportFileService.
///
/// Same combine, same resolve, same read.
/// The base directory is normalised with a trailing separator before the comparison, so a sibling
/// directory sharing a name prefix cannot satisfy it.
///
/// Any finding reported in this file is a false positive.
/// </summary>
public class SafeReportFileService
{
    private const string ReportsDirectory = "/var/lib/reports";

    public string ReadReport(string name)
    {
        string baseDirectory = Path.GetFullPath(ReportsDirectory) + Path.DirectorySeparatorChar;
        string fullPath = Path.GetFullPath(Path.Combine(baseDirectory, name));

        if (!fullPath.StartsWith(baseDirectory, StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("Report name escapes the reports directory");
        }

        return File.ReadAllText(fullPath);
    }
}
