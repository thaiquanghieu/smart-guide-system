using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("subscriptions")]
public class Subscription
{
    [Key]
    [Column("id")]
    public int Id { get; set; } 

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("expire_at", TypeName = "timestamptz")]
    public DateTime ExpireAt { get; set; }
}