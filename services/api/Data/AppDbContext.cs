using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Poi> Pois => Set<Poi>();
    public DbSet<User> Users => Set<User>();
    public DbSet<PoiImage> PoiImages => Set<PoiImage>();
    public DbSet<AudioGuide> AudioGuides => Set<AudioGuide>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<QrLog> QrLogs => Set<QrLog>();

    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<ListenLog> ListenLogs => Set<ListenLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Poi>().ToTable("pois");
        modelBuilder.Entity<PoiImage>().ToTable("poi_images");
        modelBuilder.Entity<User>().ToTable("users");
        modelBuilder.Entity<AudioGuide>().ToTable("audio_guides");
        modelBuilder.Entity<Rating>().ToTable("ratings");
        modelBuilder.Entity<Plan>().ToTable("plans");
        modelBuilder.Entity<Subscription>().ToTable("subscriptions");
        modelBuilder.Entity<Payment>().ToTable("payments");
        modelBuilder.Entity<QrLog>().ToTable("qr_logs");

        // 🆕 thêm 2 bảng mới
        modelBuilder.Entity<Favorite>().ToTable("favorites");
        modelBuilder.Entity<ListenLog>().ToTable("listen_logs");

        // unique favorite (tránh trùng)
        modelBuilder.Entity<Favorite>()
            .HasIndex(x => new { x.UserId, x.PoiId })
            .IsUnique();
    }
}