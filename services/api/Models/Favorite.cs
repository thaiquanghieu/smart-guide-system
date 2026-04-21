using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("favorites")]
public class Favorite
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
