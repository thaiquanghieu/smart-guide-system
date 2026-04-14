using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Poi> Pois => Set<Poi>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<PoiImage> PoiImages => Set<PoiImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Poi>().ToTable("pois");
        modelBuilder.Entity<PoiImage>().ToTable("poi_images");
        modelBuilder.Entity<Profile>().ToTable("profiles");
    }
}