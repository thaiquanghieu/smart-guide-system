using System.Net.Http.Json;
using SmartGuideApp.Models;
using Microsoft.Maui.Storage;

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
        var userId = Preferences.Get("user_id", 0);
        var data = await _http.GetFromJsonAsync<List<POI>>($"/api/pois?userId={userId}");
        return data ?? new List<POI>();
    }

    public async Task<POI?> GetPoiByIdAsync(string id)
    {
        try
        {
            var userId = Preferences.Get("user_id", 0);
            return await _http.GetFromJsonAsync<POI>($"/api/pois/{id}?userId={userId}");
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
        var userId = Preferences.Get("user_id", 0);
        var url = $"{BaseUrl}/api/pois/favorite/{poiId}?userId={userId}&isFavorite={isFavorite}";
        await _httpClient.PostAsync(url, null);
    }

    public async Task<int?> IncreaseListenedAsync(string poiId)
    {
        var userId = Preferences.Get("user_id", 0);
        var url = $"{BaseUrl}/api/pois/listened/{poiId}?userId={userId}";
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

    public async Task<(string code, string message)> CreatePaymentAsync(int planId)
    {
        var userId = Preferences.Get("user_id", 0);

        var resp = await _http.PostAsync($"/api/payments/create?userId={userId}&planId={planId}", null);

        var json = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            return ("", json); // lỗi

        var doc = System.Text.Json.JsonDocument.Parse(json);

        var code = doc.RootElement.GetProperty("code").GetString();

        return (code ?? "", "");
    }

    public async Task<(bool ok, string message)> ScanPaymentAsync(string code)
    {
        var userId = Preferences.Get("user_id", 0);

        var resp = await _http.PostAsync($"/api/payments/scan?code={code}&userId={userId}", null);

        var json = await resp.Content.ReadAsStringAsync();

        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(json);

            if (resp.IsSuccessStatusCode)
                return (true, doc.RootElement.GetProperty("message").GetString() ?? "OK");

            return (false, doc.RootElement.GetProperty("message").GetString() ?? "Lỗi");
        }
        catch
        {
            return (false, json); // fallback nếu API trả string
        }
    }
}