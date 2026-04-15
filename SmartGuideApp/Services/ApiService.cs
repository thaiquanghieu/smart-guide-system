using System.Net.Http.Json;
using SmartGuideApp.Models;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly string BaseUrl = "http://192.168.22.4:5022";
    private readonly HttpClient _http = new HttpClient
    {
        BaseAddress = new Uri("http://192.168.22.4:5022")
    };

    public ApiService()
    {
        _httpClient = new HttpClient();
    }

    public async Task<List<POI>> GetPoisAsync()
    {
        var data = await _http.GetFromJsonAsync<List<POI>>("/api/pois");
        return data ?? new List<POI>();
    }

    public async Task<POI?> GetPoiByIdAsync(string id)
    {
        try
        {
            return await _http.GetFromJsonAsync<POI>($"/api/pois/{id}");
        }
        catch
        {
            return null;
        }
    }

    public async Task<ProfileSummary?> GetProfileAsync()
    {
        try
        {
            return await _http.GetFromJsonAsync<ProfileSummary>("/api/profiles");
        }
        catch
        {
            return null;
        }
    }

    public async Task ToggleFavoriteAsync(string poiId, bool isFavorite)
    {
        var url = $"{BaseUrl}/api/pois/favorite/{poiId}?isFavorite={isFavorite}";
        await _httpClient.PostAsync(url, null);
    }

    public async Task IncreaseListenedAsync(string poiId)
    {
        var url = $"{BaseUrl}/api/pois/listened/{poiId}";
        await _httpClient.PostAsync(url, null);
    }
}