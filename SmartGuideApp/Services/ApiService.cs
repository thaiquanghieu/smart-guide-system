using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using SmartGuideApp.Config;
using SmartGuideApp.Models;
using Microsoft.Maui.Storage;
using Microsoft.Maui.Devices;
using Microsoft.Maui.ApplicationModel;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly string BaseUrl = AppEndpoints.ApiBaseUrl;
    private readonly HttpClient _http = new HttpClient
    {
        BaseAddress = new Uri(AppEndpoints.ApiBaseUrl)
    };

    public ApiService()
    {
        _httpClient = new HttpClient();
    }

    public async Task<List<POI>> GetPoisAsync()
    {
        var deviceId = Preferences.Get("device_id", 0);
        var data = await _http.GetFromJsonAsync<List<POI>>($"/api/pois?deviceId={deviceId}");
        return data ?? new List<POI>();
    }

    public async Task<POI?> GetPoiByIdAsync(string id)
    {
        try
        {
            var deviceId = Preferences.Get("device_id", 0);
            return await _http.GetFromJsonAsync<POI>($"/api/pois/{id}?deviceId={deviceId}");
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
            var deviceId = Preferences.Get("device_id", 0);

            if (deviceId == 0) return null;

            return await _http.GetFromJsonAsync<ProfileSummary>(
                $"/api/profiles/{deviceId}");
        }
        catch
        {
            return null;
        }
    }

    public async Task ToggleFavoriteAsync(string poiId, bool isFavorite)
    {
        var deviceId = Preferences.Get("device_id", 0);
        var url = $"{BaseUrl}/api/pois/favorite/{poiId}?deviceId={deviceId}&isFavorite={isFavorite}";
        await _httpClient.PostAsync(url, null);
    }

    public async Task<int?> IncreaseListenedAsync(string poiId)
    {
        var deviceId = Preferences.Get("device_id", 0);
        var url = $"{BaseUrl}/api/pois/listened/{poiId}?deviceId={deviceId}";
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

    public async Task<(PaymentPreview? payment, string message)> CreatePaymentAsync(int planId)
    {
        var deviceId = Preferences.Get("device_id", 0);

        var resp = await _http.PostAsync($"/api/payments/create?deviceId={deviceId}&planId={planId}", null);

        var json = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            return (null, json); // lỗi

        var payment = JsonSerializer.Deserialize<PaymentPreview>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        return (payment, "");
    }

    public async Task<(bool ok, string message)> ScanPaymentAsync(string code)
    {
        var deviceId = Preferences.Get("device_id", 0);

        var resp = await _http.PostAsync($"/api/payments/scan?code={code}&deviceId={deviceId}", null);

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

    public async Task<bool> EnsureDeviceRegisteredAsync()
    {
        var result = await EnsureDeviceRegisteredWithStatusAsync();
        return result.ok;
    }

    public async Task<(bool ok, string message)> EnsureDeviceRegisteredWithStatusAsync()
    {
        var storedUuid = Preferences.Get("device_uuid", string.Empty);
        if (!Guid.TryParse(storedUuid, out var deviceUuid))
        {
            deviceUuid = Guid.NewGuid();
            Preferences.Set("device_uuid", deviceUuid.ToString());
        }

        var payload = new
        {
            deviceUuid,
            name = DeviceInfo.Current.Name,
            platform = DeviceInfo.Current.Platform.ToString().ToLowerInvariant(),
            model = DeviceInfo.Current.Model,
            appVersion = AppInfo.VersionString,
            metadata = new
            {
                manufacturer = DeviceInfo.Current.Manufacturer,
                idiom = DeviceInfo.Current.Idiom.ToString(),
                osVersion = DeviceInfo.Current.VersionString
            }
        };

        try
        {
            var json = JsonSerializer.Serialize(payload);
            var response = await _httpClient.PostAsync(
                $"{BaseUrl}/api/devices/register",
                new StringContent(json, Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrWhiteSpace(error))
                    error = "Không thể đăng ký thiết bị";

                return (false, error);
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);

            var deviceId = doc.RootElement.GetProperty("deviceId").GetInt32();
            var isActive = doc.RootElement.GetProperty("isActive").GetBoolean();
            var normalizedUuid = doc.RootElement.GetProperty("deviceUuid").GetGuid();

            Preferences.Set("device_id", deviceId);
            Preferences.Set("device_uuid", normalizedUuid.ToString());

            if (!isActive)
                return (false, "Thiết bị đã bị khóa");

            return (true, "");
        }
        catch (Exception ex)
        {
            // Tránh ném exception ra UI thread — trả về lỗi thân thiện để page hiển thị.
            var msg = ex.Message;
            // Nếu là lỗi kết nối phổ biến, thay bằng thông điệp dễ hiểu hơn.
            if (ex is HttpRequestException)
                msg = "Không thể kết nối tới server. Vui lòng kiểm tra kết nối hoặc cấu hình API.";

            return (false, msg);
        }
    }

    public async Task<(bool ok, string message, int deviceId)> EnsureDeviceReadyAsync()
    {
        var result = await EnsureDeviceRegisteredWithStatusAsync();
        var deviceId = Preferences.Get("device_id", 0);

        if (!result.ok || deviceId == 0)
        {
            var message = string.IsNullOrWhiteSpace(result.message)
                ? "Thiết bị chưa được đăng ký."
                : result.message;

            return (false, message, 0);
        }

        return (true, "", deviceId);
    }

    public async Task<(bool isActive, DateTime? expire)> CheckSubscriptionAsync()
    {
        var deviceId = Preferences.Get("device_id", 0);
        if (deviceId == 0)
            return (false, null);

        try
        {
            var json = await _http.GetStringAsync($"/api/payments/check?deviceId={deviceId}");
            var result = JsonSerializer.Deserialize<CheckResponse>(json);
            return (result?.isActive ?? false, result?.expire);
        }
        catch
        {
            return (Preferences.Get("subscription_active", false), null);
        }
    }

    private class CheckResponse
    {
        public bool isActive { get; set; }
        public DateTime? expire { get; set; }
    }

    public class PaymentPreview
    {
        public string Code { get; set; } = "";
        public PlanPreview Plan { get; set; } = new();
    }

    public class PlanPreview
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public int Days { get; set; }
        public int Price { get; set; }
    }
}
