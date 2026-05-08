using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("tours")]
public class Tour
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("description")]
    public string Description { get; set; } = "";

    [Column("cover_image_url")]
    public string? CoverImageUrl { get; set; }

    [Column("is_published")]
    public bool IsPublished { get; set; }

    [Column("created_at", TypeName = "timestamptz")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at", TypeName = "timestamptz")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
