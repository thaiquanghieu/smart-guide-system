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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Poi>().ToTable("pois");
        modelBuilder.Entity<PoiImage>().ToTable("poi_images");
        modelBuilder.Entity<User>().ToTable("users");
        modelBuilder.Entity<AudioGuide>().ToTable("audio_guides");
        modelBuilder.Entity<Rating>().ToTable("ratings");
    }
}