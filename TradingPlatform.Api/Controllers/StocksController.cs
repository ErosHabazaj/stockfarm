using Microsoft.AspNetCore.Mvc;
using TradingPlatform.Api.Models;
using TradingPlatform.Api.Services;

[ApiController]
[Route("api/[controller]")]
public class StocksController : ControllerBase
{
    private readonly IStockMarketService _market;

    public StocksController(IStockMarketService market)
    {
        _market = market;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Stock>>> GetStocks()
    {
        return Ok(await _market.GetStocksAsync());
    }

    // recent price history per symbol public like getstocks
    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<StockHistory>>> GetHistory()
    {
        return Ok(await _market.GetHistoryAsync());
    }

    // full ohlc + volume candles for one symbol over a selectable range
    // range is one of 1h 1day 7days 1month bad input -> 400 not a 500
    [HttpGet("{symbol}/candles")]
    public async Task<ActionResult<IEnumerable<Candle>>> GetCandles(string symbol, string range = "1h")
    {
        try
        {
            return Ok(await _market.GetCandlesAsync(symbol, range));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
