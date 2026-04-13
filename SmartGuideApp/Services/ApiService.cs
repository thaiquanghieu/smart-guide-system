using System.Net.Http.Json;
using SmartGuideApp.Models;

public class ApiService
{
    private readonly HttpClient _http = new HttpClient
    {
        BaseAddress = new Uri("http://192.168.22.4:5022")
    };

    public async Task<List<POI>> GetPoisAsync()
    {
        var data = await _http.GetFromJsonAsync<List<POI>>("/api/pois");
        return data ?? new List<POI>();
    }
}