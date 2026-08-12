using Reporting;
using Reporting.Safe;

// Entry point.
//
// Present so the sample is a real, buildable ASP.NET Core application rather than a folder of files.
// Tools that analyse assemblies, and CodeQL when not using build-mode none, need the build to succeed.

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient();

builder.Services.AddSingleton<CryptoService>();
builder.Services.AddScoped<ReportRepository>();
builder.Services.AddScoped<XmlIngestService>();
builder.Services.AddScoped<ReportFileService>();
builder.Services.AddHttpClient<UpstreamClient>();

builder.Services.AddSingleton<SafeCryptoService>();
builder.Services.AddScoped<SafeReportRepository>();
builder.Services.AddScoped<SafeXmlIngestService>();
builder.Services.AddScoped<SafeReportFileService>();
builder.Services.AddHttpClient<SafeUpstreamClient>();

WebApplication app = builder.Build();

app.MapControllers();

app.Run();
