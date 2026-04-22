using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("poi_translations")]
public class PoiTranslation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("language_code")]
    public string LanguageCode { get; set; } = "vi";

    [Column("name")]
    public string? Name { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    [Column("short_description")]
    public string? ShortDescription { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("price_text")]
    public string? PriceText { get; set; }
}
