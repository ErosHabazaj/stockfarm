using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradingPlatform.Api.Dtos;
using TradingPlatform.Api.Models;
using TradingPlatform.Api.Data;
using TradingPlatform.Api.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly TradingDbContext db;
    private readonly IStockMarketService market;
    public OrdersController(TradingDbContext context, IStockMarketService market)
    {
        this.db = context;
        this.market = market;
    }
    [HttpPost]
    [Authorize(Policy = "ApprovedCustomer")]
    public async Task<ActionResult<OrderResponse>> PlaceOrder(PlaceOrderRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out int parsedUserId))
        {
            return Unauthorized("Invalid token.");
        }
        else
        {
            // Price is set SERVER-SIDE from the live market — never trusted from the
            // client. That makes this a market order and stops a user from POSTing an
            // arbitrary price to buy cheap / sell high.
            var stock = (await market.GetStocksAsync()).FirstOrDefault(s => s.Symbol == request.Symbol);
            if (stock is null)
            {
                return BadRequest($"Unknown symbol '{request.Symbol}'.");
            }

            if (request.Quantity < 1)
            {
                return BadRequest("Quantity must be at least 1.");
            }


            if (request.OrderType == OrderType.Sell)
            {
                var holding = await db.Orders
                    .Where(o => o.UserId == parsedUserId
                                && o.Symbol == request.Symbol
                                && o.Status == OrderStatus.Completed)
                    .SumAsync(o => o.Type == OrderType.Buy ? o.Quantity : -o.Quantity);
                var pending = await db.Orders
                    .Where(o => o.UserId == parsedUserId
                                && o.Symbol == request.Symbol
                                && o.Status == OrderStatus.Pending)
                    .SumAsync(o =>o.Type == OrderType.Sell ? o.Quantity : 0);

                if (request.Quantity > holding - pending)
                {
                    return BadRequest($"You only own {holding - pending} share(s) of {request.Symbol}. {pending} share(s) are reserved for sale");
                } else if (request.Quantity > holding)
                {
                    return BadRequest($"You only own {holding} share(s) of {request.Symbol}.");
                }   
            }

            var order = new Order
            {
                UserId = parsedUserId,
                Symbol = request.Symbol,
                Quantity = request.Quantity,
                Price = stock.Price,
                Type = request.OrderType,
                CreatedAt = DateTime.UtcNow

            };

            await db.Orders.AddAsync(order);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, new OrderResponse
            {
                Id = order.Id,
                UserId = order.UserId,
                Symbol = order.Symbol,
                Quantity = order.Quantity,
                Price = order.Price,
                Type = order.Type,
                Status = order.Status,
                CreatedAt = order.CreatedAt
            });
        }
    }
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderResponse>> GetOrder(int id)
    {
        var order = await db.Orders.FindAsync(id);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Administrator");

        if (order is null)
        {
            return NotFound();
        }

        if (!isAdmin)
        {
            if (!int.TryParse(userId, out var parsedUserId))
            {
                return Unauthorized("Invalid token.");
            }

            if (order.UserId != parsedUserId)
            {
                return NotFound();
            }
        }

        return new OrderResponse
        {
            Id = order.Id,
            UserId = order.UserId,
            Symbol = order.Symbol,
            Quantity = order.Quantity,
            Price = order.Price,
            Type = order.Type,
            Status = order.Status,
            CreatedAt = order.CreatedAt
        };
    }
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderResponse>>> ListOrders()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Administrator");

        var query = db.Orders.AsQueryable();
        if (!isAdmin)
        {
            if (!int.TryParse(userId, out var parsedUserId))
            {
                return Unauthorized("Invalid token.");
            }

            query = query.Where(o => o.UserId == parsedUserId);
        }
        var orders = await query.Select(o => new OrderResponse
        {
            Id = o.Id,
            UserId = o.UserId,
            Symbol = o.Symbol,
            Quantity = o.Quantity,
            Price = o.Price,
            Type = o.Type,
            Status = o.Status,
            CreatedAt = o.CreatedAt
        }).ToListAsync();
        return Ok(orders);
    }
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<OrderResponse>> UpdateOrderStatus(int id, UpdateOrderStatusRequest request)
    {
        var order = await db.Orders.FindAsync(id);
        if (order == null)
        {
            return NotFound();
        }
        else
        {

            order.Status = request.Status;
            await db.SaveChangesAsync();
            var response = new OrderResponse
            {
                Id = order.Id,
                UserId = order.UserId,
                Symbol = order.Symbol,
                Quantity = order.Quantity,
                Price = order.Price,
                Type = order.Type,
                Status = order.Status,
                CreatedAt = order.CreatedAt
            };

            return Ok(response);
        }
    }
}
