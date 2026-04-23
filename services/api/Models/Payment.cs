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
    public int? DeviceId { get; set; }

    [Column("plan_id")]
    public int? PlanId { get; set; }

    [Column("owner_id")]
    public int? OwnerId { get; set; }

    [Column("poi_id")]
    public string? PoiId { get; set; }

    [Column("payer_type")]
    public string PayerType { get; set; } = "device";

    [Column("payment_type")]
    public string PaymentType { get; set; } = "user_plan";

    [Column("amount")]
    public int Amount { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("description")]
    public string? Description { get; set; }

    [Column("code")]
    public string Code { get; set; } = "";

    [Column("is_used")]
    public bool IsUsed { get; set; }

    [Column("created_at", TypeName = "timestamptz")]
    public DateTime CreatedAt { get; set; }

    [Column("used_at", TypeName = "timestamptz")]
    public DateTime? UsedAt { get; set; }

    [Column("confirmed_at", TypeName = "timestamptz")]
    public DateTime? ConfirmedAt { get; set; }

    [Column("rejected_reason")]
    public string? RejectedReason { get; set; }
}
