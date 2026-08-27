namespace TradingPlatform.Api.Dtos;

using TradingPlatform.Api.Models;
public class OrderResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public required string Symbol { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public OrderType Type { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}