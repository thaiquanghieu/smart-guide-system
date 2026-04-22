using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString =
    builder.Configuration.GetConnectionString("Default") ??
    builder.Configuration["DATABASE_URL"] ??
    builder.Configuration["ConnectionStrings__Default"];

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Missing database connection string.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(ToNpgsqlConnectionString(connectionString)));


var app = builder.Build();

// Use CORS middleware
app.UseCors("AllowAll");

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles();
app.MapGet("/health", () => Results.Ok(new { ok = true }));
app.MapControllers();

app.Run();

static string ToNpgsqlConnectionString(string value)
{
    if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return value;
    }

    var uri = new Uri(value);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var database = uri.AbsolutePath.Trim('/');
    var sslMode = uri.Host.Contains("railway.internal", StringComparison.OrdinalIgnoreCase)
        ? "Disable"
        : "Require";

    return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true";
}

