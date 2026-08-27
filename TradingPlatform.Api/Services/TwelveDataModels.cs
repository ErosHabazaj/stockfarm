namespace TradingPlatform.Api.Services;

// layer 1 raw wire shape from twelvedata
// every field is a string on purpose thats how twelvedata sends numbers
// this type only exists to catch the json we never hand it to the rest of the app

// top level of a time_series response
public class TwelveDataResponse
{
    public string Status { get; set; } = "";            // "ok" on success "error" otherwise
    public string? Message { get; set; }                // only present when status is error
    public List<TwelveDataValue>? Values { get; set; }  // null on error
}

// one bar as twelvedata sends it strings everywhere
public class TwelveDataValue
{
    public string Datetime { get; set; } = "";
    public string Open { get; set; } = "";
    public string High { get; set; } = "";
    public string Low { get; set; } = "";
    public string Close { get; set; } = "";
    public string Volume { get; set; } = "";
}
