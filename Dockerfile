# ============================================================
# Dockerfile cho TVB Maintenance Web (ASP.NET Core MVC 8)
# ============================================================

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Web_Baotri/Web_Baotri.csproj", "Web_Baotri/"]
RUN dotnet restore "Web_Baotri/Web_Baotri.csproj"

COPY . .
WORKDIR "/src/Web_Baotri"
RUN dotnet build "Web_Baotri.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Web_Baotri.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:${PORT:-5000}
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=publish /app/publish .

EXPOSE 5000

ENTRYPOINT ["dotnet", "Web_Baotri.dll"]
