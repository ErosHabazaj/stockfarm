namespace TradingPlatform.Api.Dtos;
using TradingPlatform.Api.Models;
public class UpdateOrderStatusRequest
{
    public OrderStatus Status { get; set; }
}