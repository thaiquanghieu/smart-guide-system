using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("device_entry_grants")]
public class DeviceEntryGrant
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("entry_code")]
    public string EntryCode { get; set; } = "";

    [Column("poi_id")]
    public string? PoiId { get; set; }

    [Column("free_plays_total")]
    public int FreePlaysTotal { get; set; } = 1;

    [Column("free_plays_used")]
    public int FreePlaysUsed { get; set; } = 0;

    [Column("granted_at", TypeName = "timestamptz")]
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    [Column("expires_at", TypeName = "timestamptz")]
    public DateTime? ExpiresAt { get; set; }
}
