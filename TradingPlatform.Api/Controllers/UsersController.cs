using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradingPlatform.Api.Models;
using TradingPlatform.Api.Data;
using TradingPlatform.Api.Dtos;
using TradingPlatform.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]

public class UsersController : ControllerBase
{
    private readonly TradingDbContext db;
    private readonly IPasswordHasher<User> passwordHasher;
    private readonly ITokenService tokenService;
    private readonly IEmailSender emailSender;
    private readonly ILogger<UsersController> logger;
    private readonly IConfiguration config;

    public UsersController(TradingDbContext context, IPasswordHasher<User> passwordHasher, ITokenService tokenService, IEmailSender emailSender, ILogger<UsersController> logger, IConfiguration config)
    {
        this.db = context;
        this.passwordHasher = passwordHasher;
        this.tokenService = tokenService;
        this.emailSender = emailSender;
        this.logger = logger;
        this.config = config;
    }

    [HttpPost]
    public async Task<ActionResult> Register(RegisterRequest request)
    {
        if (await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email) != null)
        {
            try
            {
                await emailSender.SendAsync(request.Email, "Registration Attempt", "There was an attempt to register an account with this email address. If this was not you, please ignore this message.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send registration attempt email to {Email}", request.Email);
            }
            return Ok(new { message = "If that email is available, you will receive a verification email." });
        }
        var token = VerificationTokens.Create();
        

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = string.Empty,
            Role = default,
            Status = default,
            EmailVerified = false,
            VerificationToken = token,
            VerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24)
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();
        try 
        {
            var verificationLink = Url.Action("VerifyEmail", "Users", new { token = token }, Request.Scheme);
            await emailSender.SendAsync(user.Email, "Verify Your Email", $"Please verify your email by clicking this link: {verificationLink}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
        }
        return Ok(new { message = "If that email is available, you will receive a verification email." });
    }
    [HttpGet("verify")]
    public async Task<ActionResult> VerifyEmail(string token)
    {
        var frontend = config["App:FrontendUrl"];
        if (string.IsNullOrEmpty(token))
        {
            return Redirect($"{frontend}/login?verified=0");
        }
        var user = await db.Users.FirstOrDefaultAsync(u => u.VerificationToken == token);
        if (user != null && user.VerificationTokenExpiresAt >= DateTime.UtcNow)
        {
            user.EmailVerified = true;
            user.VerificationToken = null;
            user.VerificationTokenExpiresAt = null;
            await db.SaveChangesAsync();
            return Redirect($"{frontend}/login?verified=1");
        }
        else
        {
            return Redirect($"{frontend}/login?verified=0");
        }
    }

    // the signed in users own record id comes from the token not the url
    // lets the frontend poll for a fresh status after an admin approves
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out int parsedUserId))
        {
            return Unauthorized();
        }
        var user = await db.Users.FindAsync(parsedUserId);
        if (user == null)
        {
            return NotFound();
        }
        return Ok(new UserResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Status = user.Status,
            Role = user.Role
        });
    }

    // id:int keeps this numeric so the me route above wins
    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserResponse>> GetUser(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }
        else
        {
            var response = new UserResponse
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Status = user.Status,
                Role = user.Role
            };

            return Ok(response);
        }
    }
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers()
    {
        var users = await db.Users.Select(u => new UserResponse
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Status = u.Status,
            Role = u.Role
        }).ToListAsync();
        return Ok(users);
    }
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<UserResponse>> UpdateStatus(int id, UpdateStatusRequest request)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }
        else
        {
            user.Status = request.Status;
            await db.SaveChangesAsync();
            var response = new UserResponse
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Status = user.Status,
                Role = user.Role
            };
            return Ok(response);
        }
    }
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            return Unauthorized("Invalid email or password.");
        }
        else
        {
            var verificationResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                return Unauthorized("Invalid email or password.");
            }
            else if (!user.EmailVerified)
            {
                return Unauthorized("Email not verified. Please check your email for the verification link.");
            }
            else
            {
                return Ok(new LoginResponse { Token = tokenService.GenerateToken(user) });
            }
        }
    }
}