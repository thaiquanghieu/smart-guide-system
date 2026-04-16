using System.Collections.ObjectModel;
using SmartGuideApp.Models;
using SmartGuideApp.Services;

namespace SmartGuideApp.ViewModels;

public class HomeViewModel : BaseViewModel
{
    public string SortBy { get; set; } = "distance";
    public bool IsAscending { get; set; } = true;

    private readonly List<POI> _allPois;
    private string _searchText = string.Empty;

    private ObservableCollection<POI> _pois = new();
    public ObservableCollection<POI> Pois
    {
        get => _pois;
        set => SetProperty(ref _pois, value);
    }

    // Trong HomeViewModel.cs
    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetProperty(ref _searchText, value))
            {
                // CHỈ update suggestion khi đang gõ
                UpdateSuggestions(); 
                
                // ĐỪNG gọi ApplyFilter() ở đây nếu nó làm thay đổi danh sách Pois chính quá mạnh
                // ApplyFilter(); 
            }
        }
    }

    public string CurrentFilter { get; private set; } = "Tất cả";

    public HomeViewModel()
    {
        _allPois = new List<POI>();
        _ = LoadPoisFromApi();
    }

    private async Task LoadPoisFromApi()
    {
        try
        {
            Console.WriteLine("🚀 CALL API");

            var api = new ApiService();
            var data = await api.GetPoisAsync();

            Console.WriteLine($"✅ API COUNT: {data.Count}");

            _allPois.Clear();
            _allPois.AddRange(data);

            await DistanceService.UpdateDistancesAsync(_allPois);

            await ApplyFilter();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ API ERROR: {ex.Message}");
        }
    }

    public async Task SetFilter(string filter)
    {
        CurrentFilter = filter;
        await ApplyFilter();
        OnPropertyChanged(nameof(CurrentFilter));
    }

    

    private async Task ApplyFilter()
    {
        IEnumerable<POI> result = _allPois;

        // 🔍 SEARCH
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var keyword = SearchText.Trim();
            result = result.Where(x =>
                x.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                x.Address.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                x.Category.Contains(keyword, StringComparison.OrdinalIgnoreCase));
        }

        // 📍 UPDATE DISTANCE
        var location = await Geolocation.GetLocationAsync()
            ?? await Geolocation.GetLastKnownLocationAsync();

        if (location != null)
        {
            foreach (var poi in _allPois)
            {
                poi.DistanceKm = Location.CalculateDistance(
                    location,
                    new Location(poi.Latitude, poi.Longitude),
                    DistanceUnits.Kilometers
                );
            }
        }

        // 🎯 FILTER
        result = CurrentFilter switch
        {
            "Gần bạn" => result.Where(x => x.DistanceKm <= 2.0),
            "Miễn phí" => result.Where(x => x.PriceText.Contains("Miễn phí", StringComparison.OrdinalIgnoreCase)),
            _ => result
        };

        // 🔥 SORT
        result = SortBy switch
        {
            "distance" => IsAscending
                ? result.OrderBy(x => x.DistanceKm)
                : result.OrderByDescending(x => x.DistanceKm),

            "listened" => IsAscending
                ? result.OrderBy(x => x.ListenedCount)
                : result.OrderByDescending(x => x.ListenedCount),

            "name" => IsAscending
                ? result.OrderBy(x => x.Name)
                : result.OrderByDescending(x => x.Name),

            _ => result
        };

        Pois = new ObservableCollection<POI>(result.ToList());
    }

    private ObservableCollection<POI> _suggestions = new();
    public ObservableCollection<POI> Suggestions
    {
        get => _suggestions;
        set => SetProperty(ref _suggestions, value);
    }

    private bool _isSearchActive;
    public bool IsSearchActive
    {
        get => _isSearchActive;
        set
        {
            if (SetProperty(ref _isSearchActive, value))
            {
                // Chỉ update suggestion khi search thực sự active
                if (value)
                    UpdateSuggestions();
            }
        }
    }

    private bool _isSuggestionVisible;
    public bool IsSuggestionVisible
    {
        get => _isSuggestionVisible;
        set => SetProperty(ref _isSuggestionVisible, value);
    }

    private void UpdateSuggestions()
    {
        var keyword = SearchText?.Trim().ToLowerInvariant();

        if (!IsSearchActive || string.IsNullOrWhiteSpace(keyword))
        {
            Suggestions = new ObservableCollection<POI>();
            IsSuggestionVisible = false;
            return;
        }

        var result = _allPois
            .Where(p =>
                p.Name.ToLower().Contains(keyword) ||
                p.Address.ToLower().Contains(keyword) ||
                p.Category.ToLower().Contains(keyword))
            .Take(5)
            .ToList();

        Suggestions = new ObservableCollection<POI>(result);

        // Chỉ ẩn suggestion box, KHÔNG set IsSearchActive = false khi Suggestions rỗng
        IsSuggestionVisible = Suggestions.Any();
    }

    public void HideSuggestions()
    {
        Suggestions = new ObservableCollection<POI>();
        IsSuggestionVisible = false;
    }

    public async Task ToggleFavoriteAsync(POI poi)
    {
        var oldValue = poi.IsFavorite;
        poi.IsFavorite = !poi.IsFavorite;

        try
        {
            var api = new ApiService();
            await api.ToggleFavoriteAsync(poi.Id, poi.IsFavorite);
            await Reload();
        }
        catch
        {
            poi.IsFavorite = oldValue;
        }
    }

    public async Task SetSort(string sortKey, bool asc)
    {
        SortBy = sortKey;
        IsAscending = asc;
        await ApplyFilter();
    }

    public async Task Reload()
    {
        await LoadPoisFromApi();
    }
}