using Microsoft.AspNetCore.Mvc;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/debug")]
public class DebugController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public DebugController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("cloudinary")]
    public IActionResult GetCloudinaryDebug()
    {
        var cloudName = _configuration["CLOUDINARY_CLOUD_NAME"];
        var apiKey = _configuration["CLOUDINARY_API_KEY"];
        var apiSecret = _configuration["CLOUDINARY_API_SECRET"];
        var uploadPreset = _configuration["CLOUDINARY_UPLOAD_PRESET"];

        var mode = !string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(uploadPreset)
            ? "unsigned"
            : !string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret)
                ? "signed"
                : "local";

        return Ok(new
        {
            cloudName = cloudName ?? "",
            hasApiKey = !string.IsNullOrWhiteSpace(apiKey),
            hasApiSecret = !string.IsNullOrWhiteSpace(apiSecret),
            uploadPreset = uploadPreset ?? "",
            hasUploadPreset = !string.IsNullOrWhiteSpace(uploadPreset),
            mode
        });
    }
}
