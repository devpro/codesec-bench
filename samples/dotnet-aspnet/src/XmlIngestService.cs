using System.Xml;

namespace Reporting;

/// <summary>
/// Ingestion of externally supplied report definitions.
///
/// Intentionally vulnerable, see cases/xml-resolver-helper.
/// </summary>
public class XmlIngestService
{
    /// <summary>
    /// Build the document used for ingestion.
    ///
    /// Modern .NET leaves XmlResolver null, which is safe. Assigning an XmlUrlResolver turns that off
    /// and restores external entity resolution, so the hardening has been deliberately undone here.
    /// </summary>
    private XmlDocument NewDocument()
    {
        var document = new XmlDocument();

        // VULN: re-enables external entity resolution that the platform disables by default.
        document.XmlResolver = new XmlUrlResolver();

        return document;
    }

    public string Ingest(string xml)
    {
        XmlDocument document = NewDocument();

        document.LoadXml(xml);

        return document.DocumentElement?.Name ?? string.Empty;
    }
}
