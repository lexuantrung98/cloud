# ============================================
# AccountService Dockerfile
# Multi-stage build for .NET 8
# ============================================

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy csproj first for better layer caching
COPY AccountService/*.csproj ./AccountService/
RUN dotnet restore AccountService/AccountService.csproj

# Copy source code and build
COPY AccountService/. ./AccountService/
WORKDIR /src/AccountService

# Restore again to ensure all packages are available, then publish
RUN dotnet restore && dotnet publish -c Release -o /app/publish

# ============================================
# Runtime stage - minimal image
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final

# Install curl for health checks and icu-libs for globalization
RUN apk add --no-cache curl icu-libs

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy published files
COPY --from=build /app/publish .

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5010

# Environment variables
ENV ASPNETCORE_URLS=http://+:5010 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5010/health || exit 1

# Entry point
ENTRYPOINT ["dotnet", "AccountService.dll"]
