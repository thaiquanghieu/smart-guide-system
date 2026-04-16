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
            var userId = Preferences.Get("user_id", 0);

            if (userId == 0) return null;

            return await _http.GetFromJsonAsync<ProfileSummary>(
                $"/api/profiles/{userId}");
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

    public async Task<int?> IncreaseListenedAsync(string poiId)
    {
        var url = $"{BaseUrl}/api/pois/listened/{poiId}";
        var resp = await _httpClient.PostAsync(url, null);
        if (!resp.IsSuccessStatusCode) return null;

        try
        {
            using var stream = await resp.Content.ReadAsStreamAsync();
            var doc = await System.Text.Json.JsonDocument.ParseAsync(stream);
            if (doc.RootElement.TryGetProperty("listened_count", out var lc))
                return lc.GetInt32();
        }
        catch { }

        return null;
    }
}