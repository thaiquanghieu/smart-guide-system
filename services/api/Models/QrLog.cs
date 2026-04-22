using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("qr_logs")]
public class QrLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("qr_entry_id")]
    public int? QrEntryId { get; set; }

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("poi_id")]
    public string? PoiId { get; set; }

    [Column("code")]
    public string Code { get; set; } = "";

    [Column("granted_free_listen")]
    public bool GrantedFreeListen { get; set; }

    [Column("scan_status")]
    public string ScanStatus { get; set; } = "granted";

    [Column("scanned_at", TypeName = "timestamptz")]
    public DateTime ScannedAt { get; set; } = DateTime.UtcNow;
}
