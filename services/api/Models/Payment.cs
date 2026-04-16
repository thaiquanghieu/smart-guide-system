using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("payments")]
public class Payment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("code")]
    public string Code { get; set; } = "";

    [Column("is_used")]
    public bool IsUsed { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("used_at")]
    public DateTime? UsedAt { get; set; }
}