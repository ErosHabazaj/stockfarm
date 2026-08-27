using TradingPlatform.Api.Models;

namespace TradingPlatform.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
