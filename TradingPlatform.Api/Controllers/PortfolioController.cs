using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TradingPlatform.Api.Data;
using TradingPlatform.Api.Dtos;
using TradingPlatform.Api.Models;


[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PortfolioController : ControllerBase
{
    private readonly TradingDbContext db;
    public PortfolioController(TradingDbContext context) => this.db = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PortfolioItem>>> GetPortfolio()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out int parsedUserId))
        {
            return Unauthorized("Invalid token.");
        }

        var portfolio = await db.Orders
            .Where(o => o.UserId == parsedUserId && o.Status == OrderStatus.Completed)
            .GroupBy(o => o.Symbol)
            .Select(g => new PortfolioItem
            {
                Symbol = g.Key,
                Quantity = g.Sum(o => o.Type == OrderType.Buy ? o.Quantity : -o.Quantity)
            }).Where(p => p.Quantity > 0)
            .ToListAsync();

        return Ok(portfolio);
    }
}