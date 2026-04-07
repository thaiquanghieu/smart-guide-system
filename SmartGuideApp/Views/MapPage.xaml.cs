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

                MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                    new Location(poi.Latitude, poi.Longitude),
                    Distance.FromMeters(300)
                ));

                e.HideInfoWindow = true;
            };

            MainMap.Pins.Add(pin);
        }

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
        ViewModel.ClearSelection();
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

    private async void OnMyLocationClicked(object sender, EventArgs e)
    {
        var location = await Geolocation.GetLastKnownLocationAsync();

        if (location != null)
        {
            MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                new Location(location.Latitude, location.Longitude),
                Distance.FromMeters(500)
            ));
        }
    }

    private async void OnLayerClicked(object sender, EventArgs e)
    {
        var result = await DisplayActionSheet("Chọn chế độ bản đồ", "Huỷ", null,
            "Bình thường", "Vệ tinh", "Kết hợp");

        if (result == "Bình thường")
            MainMap.MapType = MapType.Street;

        else if (result == "Vệ tinh")
            MainMap.MapType = MapType.Satellite;

        else if (result == "Kết hợp")
            MainMap.MapType = MapType.Hybrid;
    }
}