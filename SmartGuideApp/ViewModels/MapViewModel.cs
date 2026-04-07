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
                OnPropertyChanged(nameof(Title));
                OnPropertyChanged(nameof(Category));
                OnPropertyChanged(nameof(ImageUrl));
                OnPropertyChanged(nameof(DistanceText));
                OnPropertyChanged(nameof(RatingText));
                OnPropertyChanged(nameof(Address));
                OnPropertyChanged(nameof(IsPoiSelected));
                OnPropertyChanged(nameof(Poi1Border));
                OnPropertyChanged(nameof(Poi2Border));
            }
        }
    }

    public bool IsPoiSelected => SelectedPoi != null;

    public string Title => SelectedPoi?.Name ?? "";
    public string Category => SelectedPoi?.Category?.ToUpper() ?? "";
    public string ImageUrl => SelectedPoi?.ImageUrl ?? "";
    public string DistanceText => SelectedPoi is null ? "" : $"{(int)(SelectedPoi.DistanceKm * 1000)}m";
    public string RatingText => "4.8";
    public string Address => SelectedPoi?.Address ?? "";

    // 👇 chỉ hiện viền khi selected
    public string Poi1Border =>
        SelectedPoi?.Id == "1" ? "#0F5BD7" : "#E5E7EB";

    public string Poi2Border =>
        SelectedPoi?.Id == "3" ? "#0F5BD7" : "#E5E7EB";

    public MapViewModel()
    {
        var service = new MockDataService();
        var pois = service.GetPois();

        foreach (var poi in pois)
            Pois.Add(poi);

        SelectedPoi = null;
    }

    public void SelectPoi(string poiId)
    {
        var poi = Pois.FirstOrDefault(x => x.Id == poiId);
        if (poi != null)
            SelectedPoi = poi;
    }
}