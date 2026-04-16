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

    // Password hasher (can be replaced by DI if you prefer)
    private readonly PasswordHasher<User> _hasher = new PasswordHasher<User>();

    // =========================
    // REGISTER (USER/OWNER)
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

        var role = request.Role == "owner" ? "owner" : "user";

        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            Role = role,
            IsActive = true
        };

        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { userId = user.Id, role = user.Role });
    }

    // =========================
    // LOGIN (USER/OWNER)
    // =========================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x =>
            (x.Email == request.Input || x.UserName == request.Input) &&
            (x.Role == "user" || x.Role == "owner"));

        if (user == null)
            return BadRequest(new { message = "Sai tài khoản hoặc tài khoản không phải user/owner" });

        if (!user.IsActive)
            return BadRequest(new { message = "Tài khoản đã bị vô hiệu hóa" });

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify != PasswordVerificationResult.Success)
            return BadRequest(new { message = "Sai mật khẩu" });

        return Ok(new { userId = user.Id, role = user.Role });
    }

    // =========================
    // ADMIN LOGIN (NO PASSWORD CHECK)
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

        // Admin login không cần check password
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
    public string Role { get; set; } = "user"; // "user" or "owner"
}

public class LoginRequest
{
    public string Input { get; set; } = "";
    public string Password { get; set; } = "";
}