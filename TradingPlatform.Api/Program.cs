using System.Text;
using Scalar.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using TradingPlatform.Api.Data;
using Microsoft.AspNetCore.Identity;
using TradingPlatform.Api.Models;
using TradingPlatform.Api.Services;
using TradingPlatform.Api.Authorization;
using Microsoft.AspNetCore.Authorization;
var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Missing ConnectionStrings:DefaultConnection. Configure it with user-secrets locally " +
        "or ConnectionStrings__DefaultConnection in the hosting environment.");

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key must be configured outside source control and contain at least 32 bytes.");
}

var frontendUrl = builder.Configuration["App:FrontendUrl"] ?? "http://localhost:4200";

// Add services to the container.

builder.Services.AddControllers()
    // accept enums as their names ("Approved") instead of numbers (1)
    // so the API is readable
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.AddDbContext<TradingDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddSingleton<ITokenService, TokenService>();

builder.Services.AddSingleton<IStockMarketService, StockMarketService>();

// bind the Email config section into EmailSettings so IOptions<EmailSettings> works
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
// stateless sender safe to share so singleton like the others
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();

// bind twelvedata config apikey comes from user-secrets
builder.Services.Configure<TwelveDataSettings>(builder.Configuration.GetSection("TwelveData"));
// typed httpclient lets di pool the sockets instead of us newing httpclient
builder.Services.AddHttpClient<TwelveDataClient>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true
        };
    });
builder.Services.AddAuthorization(options =>

    options.AddPolicy("ApprovedCustomer", p =>
        p.Requirements.Add(new ApprovedCustomerRequirement())));
builder.Services.AddScoped<IAuthorizationHandler, ApprovedCustomerHandler>();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

//lets the angular dev server talk to the api, its a trusted origin now
const string DevCorsPolicy = "AllowAngularDev";
builder.Services.AddCors(options =>
    options.AddPolicy(DevCorsPolicy, policy =>
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()   // let the browser send Content-Type, Authorization, etc.
              .AllowAnyMethod())); // GET, POST, PUT, DELETE, and the preflight OPTIONS



var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TradingDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

    // apply any pending migrations before we query so a fresh (empty) database
    // like the one in docker gets its tables built on first boot
    await db.Database.MigrateAsync();

    var seedAdminEmail = builder.Configuration["SeedAdmin:Email"];
    var seedAdminPassword = builder.Configuration["SeedAdmin:Password"];
    var hasSeedAdminEmail = !string.IsNullOrWhiteSpace(seedAdminEmail);
    var hasSeedAdminPassword = !string.IsNullOrWhiteSpace(seedAdminPassword);

    // Requiring both values prevents a half-configured production deployment.
    if (hasSeedAdminEmail != hasSeedAdminPassword)
    {
        throw new InvalidOperationException(
            "Configure both SeedAdmin:Email and SeedAdmin:Password, or configure neither.");
    }

    if (hasSeedAdminEmail && seedAdminPassword!.Length < 12)
    {
        throw new InvalidOperationException("SeedAdmin:Password must contain at least 12 characters.");
    }

    // Seeding is optional and idempotent: restarts never create duplicate admins.
    if (hasSeedAdminEmail && !await db.Users.AnyAsync(u => u.Email == seedAdminEmail))
    {
        var admin = new User
        {
            Name = builder.Configuration["SeedAdmin:Name"] ?? "Seed Admin",
            Email = seedAdminEmail!,
            PasswordHash = string.Empty,
            Role = UserRole.Administrator,
            Status = AccountStatus.Approved,
            EmailVerified = true
        };
        admin.PasswordHash = hasher.HashPassword(admin, seedAdminPassword!);
        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
// ---------------------------------------------------------------------------

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

//only https in production not dev
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// UseCors must sit BEFORE UseAuthentication/UseAuthorization so the permission
// check runs before anything rejects the request.
app.UseCors(DevCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
