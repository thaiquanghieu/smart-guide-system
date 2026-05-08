using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("tour_pois")]
public class TourPoi
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("tour_id")]
    public int TourId { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("sort_order")]
    public int SortOrder { get; set; }
}
