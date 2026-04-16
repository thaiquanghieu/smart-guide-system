using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_name")]
    public string UserName { get; set; } = string.Empty;

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("avatar_url")]
    public string AvatarUrl { get; set; } = string.Empty;

    [Column("favorite_count")]
    public int FavoriteCount { get; set; }

    [Column("listened_poi_count")]
    public int ListenedPoiCount { get; set; }

    [Column("role")]
    public string Role { get; set; } = "user"; // "user", "owner", "admin"

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
