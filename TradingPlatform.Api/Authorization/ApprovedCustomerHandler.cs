namespace TradingPlatform.Api.Authorization;

using Microsoft.AspNetCore.Authorization;
using TradingPlatform.Api.Data;
using System.Security.Claims;
using TradingPlatform.Api.Models;

public class ApprovedCustomerHandler : AuthorizationHandler<ApprovedCustomerRequirement>
{
    private readonly TradingDbContext db;
    public ApprovedCustomerHandler(TradingDbContext db) => this.db = db;

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ApprovedCustomerRequirement requirement)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out int parsedUserId))
        {
            return;
        }
        var user = await db.Users.FindAsync(parsedUserId);
        if (user != null && user.Status == AccountStatus.Approved)
        {
            context.Succeed(requirement);
        }
        else
        {
            return;
        }

    }

}