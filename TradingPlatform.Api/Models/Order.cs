namespace TradingPlatform.Api.Models;

public class Order
{
    public int Id { get; set; }
    //foreign key
    public int UserId { get; set; }
    //navigation (nullable, doesnt populate unless asked to)
    public User? User { get; set; }
    public required string Symbol { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public OrderType Type { get; set; }
    public OrderStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
}