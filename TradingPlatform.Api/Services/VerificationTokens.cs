using System.Buffers.Text;
using System.Security.Cryptography;

namespace TradingPlatform.Api.Services;

// makes the random token that goes in the verification link
public static class VerificationTokens
{
    public static string Create()
    {
        // 32 cryptographically random bytes 256 bits far too large to brute force
        var bytes = RandomNumberGenerator.GetBytes(32);
        // url safe encoding no + / or = so it drops straight into a query string
        return Base64Url.EncodeToString(bytes);
    }
}
