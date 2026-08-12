# xml-resolver-helper

**CWE-611, difficulty 3, cross-function within one file.**

## The defect

```csharp
// XmlIngestService.cs:23, inside NewDocument()
document.XmlResolver = new XmlUrlResolver();

// XmlIngestService.cs:32, inside Ingest()
document.LoadXml(xml);
```

Modern .NET leaves `XmlDocument.XmlResolver` null, which disables external entity resolution by default.
Assigning an `XmlUrlResolver` deliberately undoes that, and the caller then loads an untrusted request body.

## The asymmetry this case exists to show

This is the mirror image of [java-spring/xxe-parser-helper](../../../java-spring/cases/xxe-parser-helper/):

Sample        | Shape of the defect                                | Detected
--------------|----------------------------------------------------|---------
java-spring   | **Absence** of hardening calls on the factory       | yes
dotnet-aspnet | **Presence** of a call removing platform hardening  | no

Both are single expressions with a named type, at the same ladder level, in the same vulnerability class.
Both are reachable by a purely syntactic rule.
Only the absence form is covered.

The presence form is arguably the more alarming of the two.
An unhardened factory is usually an oversight, while assigning a resolver over a safe default is a deliberate act someone wrote on purpose, and it survives code review precisely because it looks like configuration.

`untrusted-load` is the genuine cross-function half, and it is missed like every other level 3 flow in this bench.

## The safe counterpart

`src/Safe/SafeXmlIngestService.cs` keeps the same helper and caller split, leaving the resolver null.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
