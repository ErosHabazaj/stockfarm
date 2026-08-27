# Stockfarm

Stockfarm is a proof-of-concept trading platform built as a learning project with
ASP.NET Core, Angular, Entity Framework Core, and PostgreSQL.

Customers can register, verify their email, wait for administrator approval, view
market data, place mocked buy or sell orders, and track their portfolio. Administrators
can manage customer account status and review orders.

## Project structure

- `TradingPlatform.Api` — controller-based ASP.NET Core Web API targeting .NET 10
- `trading-platform-web` — Angular 20 single-page application
- PostgreSQL — persistent users, orders, and account state

## Local development

The backend deliberately keeps credentials out of tracked configuration. Configure
local values with .NET user-secrets from `TradingPlatform.Api`:

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=tradingplatform;Username=YOUR_USER"
dotnet user-secrets set "Jwt:Key" "YOUR_RANDOM_KEY_WITH_AT_LEAST_32_BYTES"
dotnet user-secrets set "TwelveData:ApiKey" "YOUR_TWELVE_DATA_KEY"
```

Email and optional seeded-administrator settings are listed in
`TradingPlatform.Api/.env.example`. Use user-secrets locally and environment variables
in hosted environments; never commit real values.

Run the API:

```bash
cd TradingPlatform.Api
dotnet run
```

Run the Angular app in another terminal. Node 22 is required:

```bash
cd trading-platform-web
npm ci
npm start
```

The Angular development server proxies `/api` requests to `http://localhost:5106`.

## Verification

```bash
dotnet build TradingPlatform.Api/TradingPlatform.Api.csproj
cd trading-platform-web
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

## Deployment

The Angular application is configured for Vercel. Use `trading-platform-web` as the
Vercel project root.

The ASP.NET Core API is a long-running container application and needs a .NET-capable
host plus PostgreSQL. After the API is deployed, add an `/api/:path*` Vercel rewrite to
that external API before the single-page application fallback in `vercel.json`, and set
`App__FrontendUrl` on the API to the Vercel production URL.
