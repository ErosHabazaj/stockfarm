namespace TradingPlatform.Api.Services;

// strongly typed view of the TwelveData config section
// apikey comes from user-secrets in dev never appsettings so it stays out of git
public class TwelveDataSettings
{
    public string ApiKey { get; set; } = "";
    public string BaseUrl { get; set; } = "https://api.twelvedata.com";
}
