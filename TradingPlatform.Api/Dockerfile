# ---- build stage: the heavy SDK image compiles the app ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# copy only the csproj first and restore, so docker can cache the restore layer
# as long as dependencies dont change editing code wont re-download packages
COPY *.csproj .
RUN dotnet restore

# now bring in the rest of the source and publish a release build
COPY . .
RUN dotnet publish -c Release -o /app

# ---- runtime stage: a slim image that only knows how to run, not build ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# listen on 8080 inside the container (plain http, tls is the proxys job)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TradingPlatform.Api.dll"]
