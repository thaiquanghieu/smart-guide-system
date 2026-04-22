using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("ratings")]
public class Rating
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = string.Empty;

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("rating_value")]
    public short RatingValue { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
