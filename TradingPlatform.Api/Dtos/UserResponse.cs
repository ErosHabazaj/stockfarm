using TradingPlatform.Api.Models;

namespace TradingPlatform.Api.Dtos;

public class UserResponse
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public AccountStatus Status { get; set; }
    public UserRole Role { get; set; }

}