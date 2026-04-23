using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("devices")]
public class Device
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("device_uuid")]
    public Guid DeviceUuid { get; set; }

    [Column("token_hash")]
    public string? TokenHash { get; set; }

    [Column("token_issued_at", TypeName = "timestamptz")]
    public DateTime? TokenIssuedAt { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("platform")]
    public string? Platform { get; set; }

    [Column("model")]
    public string? Model { get; set; }

    [Column("app_version")]
    public string? AppVersion { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("deleted_at", TypeName = "timestamptz")]
    public DateTime? DeletedAt { get; set; }

    [Column("banned_at", TypeName = "timestamptz")]
    public DateTime? BannedAt { get; set; }

    [Column("ban_reason")]
    public string? BanReason { get; set; }

    [Column("last_seen", TypeName = "timestamptz")]
    public DateTime? LastSeen { get; set; }

    [Column("registered_at", TypeName = "timestamptz")]
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    [Column("metadata", TypeName = "jsonb")]
    public string Metadata { get; set; } = "{}";

    [Column("push_token")]
    public string? PushToken { get; set; }

    [Column("qr_code")]
    public string? QrCode { get; set; }
}
