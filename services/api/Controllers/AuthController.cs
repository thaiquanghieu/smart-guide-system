using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

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

    // =========================
    // REGISTER
    // =========================
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Thiếu dữ liệu");
        }

        if (request.Password.Length < 6)
            return BadRequest("Mật khẩu tối thiểu 6 ký tự");

        if (await _db.Users.AnyAsync(x => x.Email == request.Email))
            return BadRequest("Email đã tồn tại");

        if (await _db.Users.AnyAsync(x => x.UserName == request.UserName))
            return BadRequest("Tên đã tồn tại");

        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            PasswordHash = request.Password // demo → chưa hash
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { userId = user.Id });
    }

    // =========================
    // LOGIN
    // =========================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x =>
            x.Email == request.Input ||
            x.UserName == request.Input);

        if (user == null)
            return BadRequest("Sai tài khoản");

        if (user.PasswordHash != request.Password)
            return BadRequest("Sai mật khẩu");

        return Ok(new { userId = user.Id });
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