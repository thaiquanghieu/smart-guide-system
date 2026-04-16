using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("listen_logs")]
public class ListenLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("listened_at")]
    public DateTime ListenedAt { get; set; }
}