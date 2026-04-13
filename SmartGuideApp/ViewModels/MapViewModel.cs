using System.Collections.ObjectModel;
using SmartGuideApp.Models;
using SmartGuideApp.Services;

namespace SmartGuideApp.ViewModels;

public class MapViewModel : BaseViewModel
{
    public ObservableCollection<POI> Pois { get; } = new();
    public ObservableCollection<POI> FilteredPois { get; } = new();
    public ObservableCollection<POI> Suggestions { get; } = new();

    private bool _isSearchActive;
    public bool IsSearchActive
    {
        get => _isSearchActive;
        set
        {
            if (SetProperty(ref _isSearchActive, value))
                UpdateSuggestions();
        }
    }

    private bool _isSuggestionVisible;
    public bool IsSuggestionVisible
    {
        get => _isSuggestionVisible;
        set => SetProperty(ref _isSuggestionVisible, value);
    }

    private string _searchText = "";
    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetProperty(ref _searchText, value))
            {
                FilterPois();
                UpdateSuggestions();
            }
        }
    }

    private POI? _selectedPoi;
    public POI? SelectedPoi
    {
        get => _selectedPoi;
        set
        {
            if (SetProperty(ref _selectedPoi, value))
            {
                OnPropertyChanged(nameof(IsPoiSelected));
                OnPropertyChanged(nameof(Title));
                OnPropertyChanged(nameof(Category));
                OnPropertyChanged(nameof(ImageUrl));
                OnPropertyChanged(nameof(DistanceText));
                OnPropertyChanged(nameof(RatingText));
                OnPropertyChanged(nameof(Address));
                OnPropertyChanged(nameof(Description));
            }
        }
    }

    public bool IsPoiSelected => SelectedPoi != null;

    public string Title => SelectedPoi?.Name ?? "";
    public string Category => SelectedPoi?.Category?.ToUpper() ?? "";
    public string ImageUrl => SelectedPoi?.ImageUrl ?? "";
    public string DistanceText => SelectedPoi?.DistanceText ?? "";
    public string RatingText => "4.8";
    public string Address => SelectedPoi?.Address ?? "";
    public string Description => SelectedPoi?.Description ?? "";

    public MapViewModel()
    {
        _ = LoadPoisFromApi();
    }

    private async Task LoadPoisFromApi()
    {
        try
        {
            var api = new ApiService();
            var data = await api.GetPoisAsync();

            Pois.Clear();
            FilteredPois.Clear();

            foreach (var poi in data)
            {
                Pois.Add(poi);
                FilteredPois.Add(poi);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ API ERROR: {ex.Message}");
        }
    }

    public void FilterPois()
    {
        FilteredPois.Clear();

        var keyword = Normalize(SearchText);

        IEnumerable<POI> result;

        if (string.IsNullOrWhiteSpace(keyword))
        {
            result = Pois;
        }
        else
        {
            result = Pois
                .Select(p => new { Poi = p, Score = GetScore(p, keyword) })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Poi.Name)
                .Select(x => x.Poi);
        }

        foreach (var poi in result)
            FilteredPois.Add(poi);
    }

    private void UpdateSuggestions()
    {
        Suggestions.Clear();

        var keyword = Normalize(SearchText);

        if (!IsSearchActive || string.IsNullOrWhiteSpace(keyword))
        {
            IsSuggestionVisible = false;
            return;
        }

        var result = Pois
            .Select(p => new { Poi = p, Score = GetScore(p, keyword) })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Poi.Name)
            .Take(5)
            .Select(x => x.Poi);

        foreach (var poi in result)
            Suggestions.Add(poi);

        IsSuggestionVisible = Suggestions.Any();
    }

    private static int GetScore(POI poi, string keyword)
    {
        int score = 0;

        var name = Normalize(poi.Name);
        var category = Normalize(poi.Category);
        var address = Normalize(poi.Address);
        var tags = poi.Categories.Select(Normalize).ToList();

        if (keyword.Length == 1)
        {
            if (WordStartsWith(name, keyword)) score += 100;
            if (WordStartsWith(category, keyword)) score += 60;
            if (tags.Any(t => WordStartsWith(t, keyword))) score += 60;

            return score;
        }

        if (name.StartsWith(keyword)) score += 120;
        else if (name.Contains(keyword)) score += 80;

        if (category.StartsWith(keyword)) score += 70;
        else if (category.Contains(keyword)) score += 45;

        if (tags.Any(t => t.StartsWith(keyword))) score += 65;
        else if (tags.Any(t => t.Contains(keyword))) score += 40;

        if (address.StartsWith(keyword)) score += 35;
        else if (address.Contains(keyword)) score += 20;

        return score;
    }

    private static bool WordStartsWith(string source, string keyword)
    {
        return source
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Any(w => w.StartsWith(keyword));
    }

    private static string Normalize(string? text)
    {
        return (text ?? "").Trim().ToLowerInvariant();
    }

    public void SelectPoi(POI poi)
    {
        SelectedPoi = poi;
        Suggestions.Clear();
        IsSuggestionVisible = false;
    }

    public void ClearSelection()
    {
        SelectedPoi = null;
    }

    public void HideSuggestions()
    {
        Suggestions.Clear();
        IsSuggestionVisible = false;
    }

    public void FocusToPoi(string poiId)
    {
        var poi = Pois.FirstOrDefault(p => p.Id == poiId);
        if (poi == null) return;

        SelectedPoi = poi;

    }
}