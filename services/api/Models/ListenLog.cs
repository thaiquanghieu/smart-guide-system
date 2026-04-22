using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("listen_logs")]
public class ListenLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("duration_seconds")]
    public int DurationSeconds { get; set; } = 0;

    [Column("listened_at")]
    public DateTime ListenedAt { get; set; } = DateTime.UtcNow;
}
