using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("pois")]
public class Poi
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = "";

    [Column("owner_id")]
    public int? OwnerId { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("category")]
    public string Category { get; set; } = "";

    [Column("categories", TypeName = "jsonb")]
    [System.Text.Json.Serialization.JsonIgnore]
    public string CategoriesJson { get; set; } = "[]";

    [Column("short_description")]
    public string ShortDescription { get; set; } = "";

    [Column("description")]
    public string Description { get; set; } = "";

    [Column("address")]
    public string Address { get; set; } = "";

    [Column("open_time")]
    public string OpenTime { get; set; } = "";

    [Column("close_time")]
    public string CloseTime { get; set; } = "";

    [Column("price_text")]
    public string PriceText { get; set; } = "";

    [Column("radius")]
    public int Radius { get; set; } = 100;

    [Column("priority")]
    public int Priority { get; set; } = 0;

    [Column("status")]
    public string Status { get; set; } = "pending"; // "pending", "approved", "rejected", "seller_deleted"

    [Column("approval_note")]
    public string? ApprovalNote { get; set; }

    [Column("rejected_reason")]
    public string? RejectedReason { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("website_url")]
    public string? WebsiteUrl { get; set; }

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

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
