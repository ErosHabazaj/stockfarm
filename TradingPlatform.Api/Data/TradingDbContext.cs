using Microsoft.EntityFrameworkCore;
using TradingPlatform.Api.Models;

namespace TradingPlatform.Api.Data;

public class TradingDbContext : DbContext
{
    public TradingDbContext(DbContextOptions<TradingDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Order> Orders { get; set; }
}