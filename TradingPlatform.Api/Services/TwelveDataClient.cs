using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TradingPlatform.Api.Models;

namespace TradingPlatform.Api.Services;

// talks to the twelvedata rest api over http
public class TwelveDataClient
{
    private readonly HttpClient _http;
    private readonly TwelveDataSettings _settings;

    // twelvedata fields are lowercase (open close volume) so match case-insensitively
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public TwelveDataClient(HttpClient http, IOptions<TwelveDataSettings> options)
    {
        _http = http;
        _settings = options.Value;
    }

    // fetch ohlc candles for one symbol at one interval
    // returns them oldest-first ready for charting
    public async Task<IReadOnlyList<Candle>> GetCandlesAsync(string symbol, string interval, int outputsize)
    {
        var url = $"{_settings.BaseUrl}/time_series" +
                  $"?symbol={symbol}&interval={interval}&outputsize={outputsize}&apikey={_settings.ApiKey}";

        // deserialize straight into the raw layer-1 dto
        var response = await _http.GetFromJsonAsync<TwelveDataResponse>(url, JsonOpts);

        // twelvedata returns http 200 even on logical errors so we must check status ourselves
        if (response is null || response.Status != "ok" || response.Values is null)
        {
            throw new InvalidOperationException(
                $"twelvedata error for {symbol}: {response?.Message ?? "no data returned"}");
        }

        // parse each raw string bar into a clean candle
        var candles = response.Values.Select(ParseCandle).ToList();
        // wire is newest-first flip to oldest-first so charts read left to right
        candles.Reverse();
        return candles;
    }
    private static Candle ParseCandle(TwelveDataValue v)
    {
        var inv = CultureInfo.InvariantCulture;
        return new Candle(
            DateTime.Parse(v.Datetime, inv),
            decimal.Parse(v.Open, inv),
            decimal.Parse(v.High, inv),
            decimal.Parse(v.Low, inv),
            decimal.Parse(v.Close, inv),
            long.Parse(v.Volume, inv));
    }
}
