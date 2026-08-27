namespace TradingPlatform.Api.Models;

public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public AccountStatus Status { get; set; }

    // email ownership check separate from admin approval
    public bool EmailVerified { get; set; }
    // nullable the token only exists between register and the click then its cleared
    public string? VerificationToken { get; set; }
    public DateTime? VerificationTokenExpiresAt { get; set; }
}