namespace TradingPlatform.Api.Dtos;

using TradingPlatform.Api.Models;

public class PlaceOrderRequest
{
    public required string Symbol { get; set; }
    public int Quantity { get; set; }
    public OrderType OrderType { get; set; }
    // No Price here on purpose: the server sets the execution price from the live
    // market, so the client doesn't get to choose it.
}