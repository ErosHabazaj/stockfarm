using TradingPlatform.Api.Models;

namespace TradingPlatform.Api.Services;

public class StockMarketService : IStockMarketService
{
    // the symbols we track name is ours twelvedata only knows the ticker
    private static readonly (string Symbol, string Name)[] Symbols =
    [
        ("AAPL", "Apple Inc."),
        ("GOOGL", "Alphabet Inc."),
        ("MSFT", "Microsoft Corporation")
    ];

    // user-facing range -> twelvedata interval + how many bars to pull
    // one place maps the frontends buttons onto the api validation lives here too
    private static readonly Dictionary<string, (string Interval, int OutputSize)> Ranges = new()
    {
        ["1h"]     = ("1min", 60),
        ["1day"]   = ("15min", 26),  // one 9:30-16:00 session so no overnight gap
        ["7days"]  = ("1h", 48),
        ["1month"] = ("1day", 30),
    };

    // the series that feeds the dashboard price + small chart
    // 1min candles over the last hour so it still feels lively
    private const string DefaultInterval = "1min";
    private const int DefaultOutputSize = 60;

    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(2);

    private readonly TwelveDataClient _client;

    // one cache entry the candles plus when we fetched them
    private sealed record CacheEntry(DateTime FetchedAt, IReadOnlyList<Candle> Candles);

    // keyed by symbol+interval so 1h and 1day live side by side
    private readonly Dictionary<(string Symbol, string Interval), CacheEntry> _cache = new();
    // guards _cache only never held across the network call below
    private readonly object _lock = new();

    public StockMarketService(TwelveDataClient client)
    {
        _client = client;
    }

    public async Task<IReadOnlyList<Stock>> GetStocksAsync()
    {
        var stocks = new List<Stock>(Symbols.Length);
        foreach (var (symbol, name) in Symbols)
        {
            var candles = await GetCachedCandlesAsync(symbol, DefaultInterval, DefaultOutputSize);
            // newest candles close is todays price 0 if the series came back empty
            var price = candles.Count > 0 ? candles[^1].Close : 0m;
            stocks.Add(new Stock(symbol, name, price));
        }
        return stocks;
    }

    public async Task<IReadOnlyList<StockHistory>> GetHistoryAsync()
    {
        var result = new List<StockHistory>(Symbols.Length);
        foreach (var (symbol, _) in Symbols)
        {
            var candles = await GetCachedCandlesAsync(symbol, DefaultInterval, DefaultOutputSize);
            // chart only needs close over time so flatten each candle to a pricepoint
            var points = candles.Select(c => new PricePoint(c.Time, c.Close)).ToList();
            result.Add(new StockHistory(symbol, points));
        }
        return result;
    }

    public async Task<IReadOnlyList<Candle>> GetCandlesAsync(string symbol, string range)
    {
        // normalize so aapl and AAPL both work
        symbol = symbol.ToUpperInvariant();

        // validate here so we never forward junk to twelvedata and waste a call
        if (!Symbols.Any(s => s.Symbol == symbol))
        {
            throw new ArgumentException($"unknown symbol '{symbol}'");
        }
        if (!Ranges.TryGetValue(range, out var r))
        {
            throw new ArgumentException($"unknown range '{range}'");
        }

        return await GetCachedCandlesAsync(symbol, r.Interval, r.OutputSize);
    }

    // serve a series from cache if fresh otherwise fetch it and store it
    private async Task<IReadOnlyList<Candle>> GetCachedCandlesAsync(string symbol, string interval, int outputsize)
    {
        var key = (symbol, interval);

        // fast path fresh copy in memory no api call
        lock (_lock)
        {
            if (_cache.TryGetValue(key, out var entry) && DateTime.UtcNow - entry.FetchedAt < Ttl)
            {
                return entry.Candles;
            }
        }

        // slow path fetch OUTSIDE the lock a lock cant be held across an await
        // and we dont want one slow request blocking every reader
        // worst case two callers race and both fetch harmless just a couple extra calls
        var candles = await _client.GetCandlesAsync(symbol, interval, outputsize);

        lock (_lock)
        {
            _cache[key] = new CacheEntry(DateTime.UtcNow, candles);
        }
        return candles;
    }
}
