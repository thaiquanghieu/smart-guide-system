using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Poi> Pois => Set<Poi>();
}