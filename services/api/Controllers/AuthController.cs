using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using Microsoft.AspNetCore.Identity;

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
            IsActive = true
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

        if (!user.IsActive)
            return BadRequest(new { message = "Tài khoản đã bị vô hiệu hóa" });

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

        if (!user.IsActive)
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
            user.CreatedAt
        });
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
