# xxe-parser-helper

**CWE-611, difficulty 3, cross-function within one file.**

## The defect

```java
// XmlIngestService.java:26, inside newBuilder()
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
return factory.newDocumentBuilder();

// XmlIngestService.java:34, inside ingest()
Document document = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
```

The factory is left at its defaults, which permit DTD processing and external entity resolution.
A `DOCTYPE` in the posted body can then read local files or make the server issue requests to internal hosts.

## Why this case is the exception in the bench

`unsafe-parser-factory` is **detected**, and it is the only level 3 expectation detected anywhere in this repository.

The reason is that it is not really a dataflow problem.
Every other level 3 case asks a tool to follow a value across a method boundary.
This one is an **absence**: the factory is missing hardening calls that should be there, and a purely syntactic rule can see that without any analysis at all.

`untrusted-parse`, the second expectation, is the genuine level 3 half.
Reporting the `parse` call requires knowing the builder came from an unsafely configured factory in another method.
It is missed.

## Why that distinction matters

"Detects XXE" is a claim worth interrogating.

Recognising an unhardened `DocumentBuilderFactory` anywhere in a codebase is cheap, and it fires equally on a parser that only ever reads trusted configuration files shipped with the application.
Knowing that untrusted XML reaches a parser is a different and much stronger capability.

The first produces findings that are frequently noise.
The second is what a developer actually needs in order to prioritise, and it is the half that is missed here.

## The safe counterpart

`safe/SafeXmlIngestService.java` keeps the same helper and caller split, disallowing DOCTYPE declarations outright, which closes external entity resolution at the source rather than trying to enumerate every entity type.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
