using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SmartGuideAPI.Services;

public interface IMediaStorageService
{
    Task<string> UploadImageAsync(IFormFile file, string folder, string filePrefix);
}

public class MediaStorageService : IMediaStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string? _cloudName;
    private readonly string? _apiKey;
    private readonly string? _apiSecret;
    private readonly string? _uploadPreset;

    public MediaStorageService(IWebHostEnvironment env, IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _env = env;
        _httpClientFactory = httpClientFactory;
        _cloudName = configuration["CLOUDINARY_CLOUD_NAME"];
        _apiKey = configuration["CLOUDINARY_API_KEY"];
        _apiSecret = configuration["CLOUDINARY_API_SECRET"];
        _uploadPreset = configuration["CLOUDINARY_UPLOAD_PRESET"];
    }

    public async Task<string> UploadImageAsync(IFormFile file, string folder, string filePrefix)
    {
        if (UseCloudinary())
        {
            return await UploadToCloudinaryAsync(file, folder, filePrefix);
        }

        return await UploadToLocalStorageAsync(file, folder, filePrefix);
    }

    private bool UseCloudinary()
    {
        return !string.IsNullOrWhiteSpace(_cloudName) &&
               ((!string.IsNullOrWhiteSpace(_apiKey) && !string.IsNullOrWhiteSpace(_apiSecret)) ||
                !string.IsNullOrWhiteSpace(_uploadPreset));
    }

    private async Task<string> UploadToCloudinaryAsync(IFormFile file, string folder, string filePrefix)
    {
        if (!string.IsNullOrWhiteSpace(_apiKey) && !string.IsNullOrWhiteSpace(_apiSecret))
        {
            return await UploadToCloudinarySignedAsync(file, folder, filePrefix);
        }

        if (!string.IsNullOrWhiteSpace(_uploadPreset))
        {
            return await UploadToCloudinaryUnsignedAsync(file, folder);
        }

        throw new InvalidOperationException("Cloudinary is configured incompletely.");
    }

    private async Task<string> UploadToCloudinarySignedAsync(IFormFile file, string folder, string filePrefix)
    {
        var safePrefix = SanitizeSegment(filePrefix);
        var publicId = $"{safePrefix}-{Guid.NewGuid():N}";
        var cloudinaryFolder = $"smart-guide-system/{SanitizeSegment(folder)}";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var signatureBase = $"folder={cloudinaryFolder}&public_id={publicId}&timestamp={timestamp}";
        var signature = ComputeSha1($"{signatureBase}{_apiSecret}");

        using var multipart = new MultipartFormDataContent();
        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType
        );

        multipart.Add(fileContent, "file", file.FileName);
        multipart.Add(new StringContent(_apiKey!), "api_key");
        multipart.Add(new StringContent(timestamp.ToString()), "timestamp");
        multipart.Add(new StringContent(cloudinaryFolder), "folder");
        multipart.Add(new StringContent(publicId), "public_id");
        multipart.Add(new StringContent(signature), "signature");

        var httpClient = _httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync(
            $"https://api.cloudinary.com/v1_1/{_cloudName}/image/upload",
            multipart
        );

        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {responseBody}");
        }

        using var json = JsonDocument.Parse(responseBody);
        var secureUrl = json.RootElement.GetProperty("secure_url").GetString();
        if (string.IsNullOrWhiteSpace(secureUrl))
        {
            throw new InvalidOperationException("Cloudinary upload did not return secure_url.");
        }

        return secureUrl;
    }

    private async Task<string> UploadToCloudinaryUnsignedAsync(IFormFile file, string folder)
    {
        var cloudinaryFolder = $"smart-guide-system/{SanitizeSegment(folder)}";

        using var multipart = new MultipartFormDataContent();
        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType
        );

        multipart.Add(fileContent, "file", file.FileName);
        multipart.Add(new StringContent(_uploadPreset!), "upload_preset");
        multipart.Add(new StringContent(cloudinaryFolder), "folder");

        var httpClient = _httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync(
            $"https://api.cloudinary.com/v1_1/{_cloudName}/image/upload",
            multipart
        );

        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {responseBody}");
        }

        using var json = JsonDocument.Parse(responseBody);
        var secureUrl = json.RootElement.GetProperty("secure_url").GetString();
        if (string.IsNullOrWhiteSpace(secureUrl))
        {
            throw new InvalidOperationException("Cloudinary upload did not return secure_url.");
        }

        return secureUrl;
    }

    private async Task<string> UploadToLocalStorageAsync(IFormFile file, string folder, string filePrefix)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safePrefix = SanitizeSegment(filePrefix);
        var uploadRoot = Path.Combine(
            _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "images",
            SanitizeSegment(folder)
        );
        Directory.CreateDirectory(uploadRoot);

        var fileName = $"{safePrefix}-{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadRoot, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        return $"/images/{SanitizeSegment(folder)}/{fileName}";
    }

    private static string SanitizeSegment(string value)
    {
        var sanitized = Regex.Replace(value ?? "", "[^a-zA-Z0-9_-]+", "-")
            .Trim('-')
            .ToLowerInvariant();

        return string.IsNullOrWhiteSpace(sanitized) ? "upload" : sanitized;
    }

    private static string ComputeSha1(string value)
    {
        var bytes = SHA1.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
