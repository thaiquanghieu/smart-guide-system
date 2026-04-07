using System.Collections.ObjectModel;
using SmartGuideApp.Models;
using SmartGuideApp.Services;

namespace SmartGuideApp.ViewModels;

public class HomeViewModel : BaseViewModel
{
    private readonly List<POI> _allPois;
    private string _searchText = string.Empty;

    public ObservableCollection<POI> Pois { get; } = new();

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetProperty(ref _searchText, value))
            {
                ApplyFilter();
            }
        }
    }

    public string CurrentFilter { get; private set; } = "Tất cả";

    public HomeViewModel()
    {
        var service = new MockDataService();
        _allPois = service.GetPois();
        ApplyFilter();
    }

    public void SetFilter(string filter)
    {
        CurrentFilter = filter;
        ApplyFilter();
        OnPropertyChanged(nameof(CurrentFilter));
    }

    private void ApplyFilter()
    {
        IEnumerable<POI> filtered = _allPois;

        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            filtered = filtered.Where(x =>
                x.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                x.Address.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                x.Category.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
        }

        filtered = CurrentFilter switch
        {
            "Gần bạn" => filtered.Where(x => x.DistanceKm <= 2.0),
            "Nổi bật" => filtered.Where(x => x.IsFavorite || x.ListenedCount >= 3),
            "Miễn phí" => filtered.Where(x => x.PriceText.Contains("Miễn phí", StringComparison.OrdinalIgnoreCase)),
            _ => filtered
        };

        Pois.Clear();
        foreach (var poi in filtered)
        {
            Pois.Add(poi);
        }
    }
}