namespace TradingPlatform.Api.Services;

// strongly typed view of the Email config section
// values come from user-secrets in development or environment variables in production
public class EmailSettings
{
    public string Host { get; set; } = "";
    public int Port { get; set; }
    public string User { get; set; } = "";
    public string Password { get; set; } = "";   // gmail app password
    public string From { get; set; } = "";        // address shown to the recipient
    public string FromName { get; set; } = "";    // display name shown to the recipient
}
