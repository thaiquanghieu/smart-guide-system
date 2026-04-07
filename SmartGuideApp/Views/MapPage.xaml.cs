using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps;
using SmartGuideApp.ViewModels;

namespace SmartGuideApp.Views;

public partial class MapPage : ContentPage
{
    private MapViewModel ViewModel => (MapViewModel)BindingContext;

    public MapPage()
    {
        InitializeComponent();

        // Ensure BindingContext is set so ViewModel is not null when Loaded fires
        BindingContext = new MapViewModel();

        Loaded += OnLoaded;
    }

    private void OnLoaded(object? sender, EventArgs e)
    {
        LoadMap();
    }

    private void LoadMap()
    {
        var pois = ViewModel.Pois;

        foreach (var poi in pois)
        {
            var pin = new Pin
            {
                Label = poi.Name,
                Address = poi.Description,
                Location = new Location(poi.Latitude, poi.Longitude),
                Type = PinType.Place
            };

            pin.MarkerClicked += (s, e) =>
            {
                ViewModel.SelectPoi(poi);
                e.HideInfoWindow = false;
            };

            MainMap.Pins.Add(pin);
        }

        // focus map vào vị trí đầu
        if (pois.Any())
        {
            var first = pois.First();
            MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                new Location(first.Latitude, first.Longitude),
                Distance.FromKilometers(1)
            ));
        }
    }

    private void OnMapClicked(object sender, MapClickedEventArgs e)
    {
        ViewModel.SelectedPoi = null;
    }

    private async void OnOpenDetailClicked(object sender, EventArgs e)
    {
        if (ViewModel.SelectedPoi == null)
            return;

        await Shell.Current.GoToAsync(nameof(DetailPage), new Dictionary<string, object>
        {
            { "Poi", ViewModel.SelectedPoi }
        });
    }
}