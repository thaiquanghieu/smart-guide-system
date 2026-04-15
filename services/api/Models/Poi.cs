using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("pois")]
public class Poi
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = "";

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("category")]
    public string Category { get; set; } = "";

    [Column("description")]
    public string Description { get; set; } = "";

    [Column("address")]
    public string Address { get; set; } = "";

    [Column("price_text")]
    public string PriceText { get; set; } = "";

    [Column("latitude")]
    public double Latitude { get; set; }

    [Column("longitude")]
    public double Longitude { get; set; }

    [Column("listened_count")]
    public int ListenedCount { get; set; }

    [Column("rating_avg")]
    public double RatingAvg { get; set; }

    [Column("rating_count")]
    public int RatingCount { get; set; }
}