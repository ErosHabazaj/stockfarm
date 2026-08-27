using TradingPlatform.Api.Models;

namespace TradingPlatform.Api.Services;

public interface IStockMarketService
{
    // current price per symbol derived from the newest real candle
    Task<IReadOnlyList<Stock>> GetStocksAsync();
    // recent price history per symbol for charts
    Task<IReadOnlyList<StockHistory>> GetHistoryAsync();
    // full ohlc + volume candles for one symbol over a selectable range
    Task<IReadOnlyList<Candle>> GetCandlesAsync(string symbol, string range);
}
