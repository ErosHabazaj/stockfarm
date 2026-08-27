namespace TradingPlatform.Api.Models;

public record Stock(string Symbol, string Name, decimal Price);

// one timestamped price point
public record PricePoint(DateTime T, decimal Price);

// a symbols price history for the charts
public record StockHistory(string Symbol, IReadOnlyList<PricePoint> Points);
public record Candle(
    DateTime Time,
    decimal Open,
    decimal High,
    decimal Low,
    decimal Close,
    long Volume);