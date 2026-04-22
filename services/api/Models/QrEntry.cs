using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("qr_entries")]
public class QrEntry
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("owner_id")]
    public int OwnerId { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("entry_code")]
    public string EntryCode { get; set; } = "";

    [Column("total_scans")]
    public int TotalScans { get; set; }

    [Column("used_scans")]
    public int UsedScans { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("expires_at", TypeName = "timestamptz")]
    public DateTime? ExpiresAt { get; set; }

    [Column("created_at", TypeName = "timestamptz")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at", TypeName = "timestamptz")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
