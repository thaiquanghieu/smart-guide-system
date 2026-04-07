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
            }
        }
    }

    public string Title => SelectedPoi?.Name ?? string.Empty;
    public string Category => SelectedPoi?.Category?.ToUpper() ?? string.Empty;
    public string ImageUrl => SelectedPoi?.ImageUrl ?? string.Empty;
    public string DistanceText => SelectedPoi is null ? string.Empty : $"{(int)(SelectedPoi.DistanceKm * 1000)}m";
    public string RatingText => "4.8";

    public MapViewModel()
    {
        var service = new MockDataService();
        var pois = service.GetPois();

        foreach (var poi in pois)
            Pois.Add(poi);

        SelectedPoi = Pois.FirstOrDefault();
    }

    public void SelectPoi(string poiId)
    {
        var poi = Pois.FirstOrDefault(x => x.Id == poiId);
        if (poi is not null)
            SelectedPoi = poi;
    }
}