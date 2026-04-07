using System.Collections.ObjectModel;
using SmartGuideApp.Models;
using SmartGuideApp.Services;

namespace SmartGuideApp.ViewModels;

public class MapViewModel : BaseViewModel
{
    public ObservableCollection<POI> Pois { get; } = new();

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

    // ===== STATE =====
    public bool IsPoiSelected => SelectedPoi != null;

    // ===== UI BINDING =====
    public string Title => SelectedPoi?.Name ?? "";
    public string Category => SelectedPoi?.Category?.ToUpper() ?? "";
    public string ImageUrl => SelectedPoi?.ImageUrl ?? "";
    public string DistanceText => SelectedPoi is null ? "" : $"{(int)(SelectedPoi.DistanceKm * 1000)}m";
    public string RatingText => "4.8";
    public string Address => SelectedPoi?.Address ?? "";
    public string Description => SelectedPoi?.Description ?? "";

    public MapViewModel()
    {
        // 👉 sau này đổi sang API rất dễ
        var service = new MockDataService();
        var pois = service.GetPois();

        foreach (var poi in pois)
            Pois.Add(poi);

        SelectedPoi = null;
    }

    public void SelectPoi(POI poi)
    {
        SelectedPoi = poi;
    }

    public void ClearSelection()
    {
        SelectedPoi = null;
    }
}