using System.Xml;

namespace Reporting.Safe;

/// <summary>
/// Correct counterpart of XmlIngestService.
///
/// Same helper and caller split, same load call.
/// The resolver is left null, which is the platform default and disables external entity resolution.
///
/// Any finding reported in this file is a false positive.
/// </summary>
public class SafeXmlIngestService
{
    private XmlDocument NewDocument()
    {
        var document = new XmlDocument();

        document.XmlResolver = null;

        return document;
    }

    public string Ingest(string xml)
    {
        XmlDocument document = NewDocument();

        document.LoadXml(xml);

        return document.DocumentElement?.Name ?? string.Empty;
    }
}
