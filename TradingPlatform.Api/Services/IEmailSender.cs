namespace TradingPlatform.Api.Services;

// sending tech can change without touching callers
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string body);
}
