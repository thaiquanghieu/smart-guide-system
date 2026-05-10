using Microsoft.AspNetCore.Mvc;
using SmartGuideAPI.Services;

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
}
