using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("qr_logs")]
public class QrLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("device_id")]
    public int DeviceId { get; set; }

    [Column("code")]
    public string Code { get; set; } = "";
}
