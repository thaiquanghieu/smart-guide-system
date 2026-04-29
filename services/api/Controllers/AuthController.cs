using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using Microsoft.AspNetCore.Identity;
using System.Text.RegularExpressions;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    private readonly PasswordHasher<User> _hasher = new PasswordHasher<User>();

    private bool VerifyPassword(User user, string password)
    {
        if (string.IsNullOrWhiteSpace(user.PasswordHash))
            return false;

        if (user.PasswordHash == password)
            return true;

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return verify == PasswordVerificationResult.Success ||
               verify == PasswordVerificationResult.SuccessRehashNeeded;
    }

    private static bool IsOwnerBlocked(User user)
    {
        return !user.IsActive || user.AccountStatus is "banned" or "canceled";
    }

    // =========================
    // REGISTER OWNER
    // =========================
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Thiếu dữ liệu" });
        }

        if (request.Password.Length < 6)
            return BadRequest(new { message = "Mật khẩu tối thiểu 6 ký tự" });

        if (await _db.Users.AnyAsync(x => x.Email == request.Email))
            return BadRequest(new { message = "Email đã tồn tại" });

        if (await _db.Users.AnyAsync(x => x.UserName == request.UserName))
            return BadRequest(new { message = "Tên đã tồn tại" });

        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            Role = "owner",
            IsActive = true,
            AccountStatus = "active"
        };

        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { userId = user.Id, role = "owner" });
    }

    // =========================
    // OWNER LOGIN
    // =========================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x =>
            (x.Email == request.Input || x.UserName == request.Input) &&
            x.Role == "owner");

        if (user == null)
            return BadRequest(new { message = "Sai tài khoản hoặc tài khoản không phải owner" });

        if (IsOwnerBlocked(user))
            return BadRequest(new { message = "Tài khoản đã bị khóa. Vui lòng liên hệ admin để được hỗ trợ." });

        if (!VerifyPassword(user, request.Password))
            return BadRequest(new { message = "Sai mật khẩu" });

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { userId = user.Id, role = user.Role });
    }

    // =========================
    // ADMIN LOGIN
    // =========================
    [HttpPost("admin-login")]
    public async Task<IActionResult> AdminLogin([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x =>
            (x.Email == request.Input || x.UserName == request.Input) &&
            x.Role == "admin");

        if (user == null)
            return BadRequest(new { message = "Sai tài khoản hoặc không phải admin" });

        if (!user.IsActive || user.AccountStatus is "banned" or "canceled")
            return BadRequest(new { message = "Tài khoản đã bị vô hiệu hóa" });

        if (!VerifyPassword(user, request.Password))
            return BadRequest(new { message = "Sai mật khẩu" });

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { userId = user.Id, role = "admin" });
    }

    // =========================
    // GET USER INFO
    // =========================
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUser(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        return Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            user.AvatarUrl,
            user.Role,
            user.IsActive,
            user.AccountStatus,
            user.CreatedAt
        });
    }

    [HttpPut("user/{userId}")]
    public async Task<IActionResult> UpdateUser(int userId, [FromBody] UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        var userName = request.UserName?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Tên và email không được để trống" });

        if (await _db.Users.AnyAsync(x => x.Id != userId && x.UserName == userName))
            return BadRequest(new { message = "Tên đã tồn tại" });

        if (await _db.Users.AnyAsync(x => x.Id != userId && x.Email == email))
            return BadRequest(new { message = "Email đã tồn tại" });

        user.UserName = userName;
        user.Email = email;
        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
            user.AvatarUrl = request.AvatarUrl.Trim();
        if (!string.IsNullOrWhiteSpace(request.AccountStatus) && user.Role == "owner")
            user.AccountStatus = request.AccountStatus.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            user.AvatarUrl,
            user.Role,
            user.IsActive,
            user.AccountStatus,
            user.CreatedAt
        });
    }

    [HttpPut("user/{userId}/status")]
    public async Task<IActionResult> UpdateOwnerStatus(int userId, [FromBody] UpdateOwnerAccountStatusRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        if (user.Role != "owner")
            return BadRequest(new { message = "Chỉ seller mới có thể thay đổi trạng thái này" });

        if (request.AccountStatus is not ("active" or "paused" or "canceled"))
            return BadRequest(new { message = "Trạng thái không hợp lệ" });

        user.AccountStatus = request.AccountStatus;
        user.IsActive = request.AccountStatus != "canceled";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            user.AvatarUrl,
            user.Role,
            user.IsActive,
            user.AccountStatus,
            user.CreatedAt
        });
    }

    [HttpPost("user/{userId}/avatar")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadAvatar(int userId, IFormFile? file)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn ảnh" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(ext))
            return BadRequest(new { message = "Chỉ hỗ trợ JPG, PNG, WEBP" });

        var root = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "avatars");
        Directory.CreateDirectory(root);

        var safeName = Regex.Replace(user.UserName ?? $"user-{user.Id}", "[^a-zA-Z0-9_-]+", "-").Trim('-').ToLowerInvariant();
        var token = Guid.NewGuid().ToString("N")[..8];
        var fileName = $"{safeName}-{token}{ext}";
        var path = Path.Combine(root, fileName);

        await using (var stream = System.IO.File.Create(path))
        {
            await file.CopyToAsync(stream);
        }

        user.AvatarUrl = $"/images/avatars/{fileName}";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { avatarUrl = user.AvatarUrl });
    }
}

// DTO
public class RegisterRequest
{
    public string UserName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginRequest
{
    public string Input { get; set; } = "";
    public string Password { get; set; } = "";
}

public class UpdateUserRequest
{
    public string UserName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public string? AccountStatus { get; set; }
}

public class UpdateOwnerAccountStatusRequest
{
    public string AccountStatus { get; set; } = "active";
}
