using Microsoft.AspNetCore.Mvc;
using SmartGuideAPI.Services;
using Microsoft.AspNetCore.Http;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/debug")]
public class DebugController : ControllerBase
{
    private readonly IMediaStorageService _mediaStorageService;

    public DebugController(IMediaStorageService mediaStorageService)
    {
        _mediaStorageService = mediaStorageService;
    }

    [HttpGet("cloudinary")]
    public IActionResult GetCloudinaryDebug()
    {
        var debugInfo = _mediaStorageService.GetDebugInfo();

        return Ok(new
        {
            cloudName = debugInfo.CloudName,
            hasApiKey = debugInfo.HasApiKey,
            hasApiSecret = debugInfo.HasApiSecret,
            uploadPreset = debugInfo.UploadPreset,
            hasUploadPreset = debugInfo.HasUploadPreset,
            mode = debugInfo.Strategy
        });
    }

    [HttpGet("cloudinary-upload-test")]
    public async Task<IActionResult> TestCloudinaryUpload()
    {
        try
        {
            var pngBytes = Convert.FromBase64String(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lmVsAAAAASUVORK5CYII="
            );

            await using var stream = new MemoryStream(pngBytes);
            var formFile = new FormFile(stream, 0, pngBytes.Length, "file", "debug.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };

            var url = await _mediaStorageService.UploadImageAsync(formFile, "debug", "cloudinary-test");
            return Ok(new
            {
                success = true,
                url
            });
        }
        catch (Exception exception)
        {
            return StatusCode(500, new
            {
                success = false,
                message = exception.Message
            });
        }
    }
}
