package com.example.reporting;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;

/**
 * Ingestion of externally supplied report definitions.
 *
 * Intentionally vulnerable, see cases/xxe-parser-helper.
 */
@Service
public class XmlIngestService {

    /**
     * Build the parser used for ingestion.
     *
     * The factory is left at its defaults, which permit DTD processing and external entity resolution.
     * The dangerous configuration is here, while the untrusted document is supplied by the caller.
     */
    private DocumentBuilder newBuilder() throws Exception {
        // VULN: no feature is disabled, so a DOCTYPE in the payload can read local files or reach internal hosts.
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

        return factory.newDocumentBuilder();
    }

    public String ingest(String xml) throws Exception {
        DocumentBuilder builder = newBuilder();

        Document document = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

        return document.getDocumentElement().getNodeName();
    }
}
