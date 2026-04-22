using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("payments")]
public class Payment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("code")]
    public string Code { get; set; } = "";

    [Column("is_used")]
    public bool IsUsed { get; set; }

    [Column("created_at", TypeName = "timestamptz")]
    public DateTime CreatedAt { get; set; }

    [Column("used_at", TypeName = "timestamptz")]
    public DateTime? UsedAt { get; set; }
}
