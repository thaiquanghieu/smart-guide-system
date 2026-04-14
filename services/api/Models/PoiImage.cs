using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

public class PoiImage
{
    [Column("id")]
    public int Id { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("image_url")]
    public string ImageUrl { get; set; } = "";

    [Column("sort_order")]
    public int SortOrder { get; set; }
}