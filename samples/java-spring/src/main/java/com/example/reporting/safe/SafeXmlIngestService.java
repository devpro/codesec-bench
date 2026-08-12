package com.example.reporting.safe;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;

/**
 * Correct counterpart of XmlIngestService.
 *
 * Same helper and caller split, same parse call.
 * DTD processing is disallowed outright, which closes external entity resolution at the source.
 *
 * Any finding reported in this file is a false positive.
 */
@Service
public class SafeXmlIngestService {

    private DocumentBuilder newBuilder() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);

        return factory.newDocumentBuilder();
    }

    public String ingest(String xml) throws Exception {
        DocumentBuilder builder = newBuilder();

        Document document = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

        return document.getDocumentElement().getNodeName();
    }
}
