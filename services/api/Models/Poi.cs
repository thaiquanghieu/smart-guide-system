using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("pois")]
public class Poi
{
    [Column("id")] // 🔥 THÊM DÒNG NÀY
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Column("name")]
    public string Name { get; set; } = "";

    [Column("description")]
    public string Description { get; set; } = "";

    [Column("latitude")]
    public double Latitude { get; set; }

    [Column("longitude")]
    public double Longitude { get; set; }
}