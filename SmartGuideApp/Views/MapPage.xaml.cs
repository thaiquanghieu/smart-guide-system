using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps;
using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;
using System.Globalization;

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

    private async void OnLoaded(object? sender, EventArgs e)
    {
        await UpdateDistances();
        LoadMap();
        await FocusUserLocation();
    }

    private async Task UpdateDistances()
    {
        var user = await Geolocation.GetLastKnownLocationAsync();
        if (user == null) return;

        foreach (var poi in ViewModel.Pois)
        {
            poi.DistanceKm = Location.CalculateDistance(
                user,
                new Location(poi.Latitude, poi.Longitude),
                DistanceUnits.Kilometers
            );
        }

        if (ViewModel.SelectedPoi != null)
        {
            var selected = ViewModel.SelectedPoi;
            ViewModel.SelectedPoi = null;
            ViewModel.SelectedPoi = selected;
        }
    }

    private void LoadMap()
    {
        MainMap.Pins.Clear();

        foreach (var poi in ViewModel.FilteredPois)
        {
            var pin = new Pin
            {
                Label = poi.Name,
                Address = string.Empty,
                Location = new Location(poi.Latitude, poi.Longitude),
                Type = PinType.Place
            };

            pin.MarkerClicked += async (s, e) =>
            {
                ViewModel.SelectPoi(poi);

                MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                    new Location(poi.Latitude, poi.Longitude),
                    Distance.FromMeters(300)
                ));

                SearchEntry.Unfocus();

                await AnimateCard();
                e.HideInfoWindow = true;
            };

            MainMap.Pins.Add(pin);
        }

        _ = FocusUserLocation();
    }

    private void OnMapClicked(object sender, MapClickedEventArgs e)
    {
        ViewModel.ClearSelection();
        ViewModel.HideSuggestions();
        ViewModel.IsSearchActive = false;
        SearchEntry.Unfocus();
    }

    private async Task AnimateCard()
    {
        BottomCard.TranslationY = 120;
        await BottomCard.TranslateTo(0, 0, 250, Easing.CubicOut);
    }

    private void OnSearchFocused(object sender, FocusEventArgs e)
    {
        ViewModel.ClearSelection();
        ViewModel.IsSearchActive = true;
    }

    private void OnSearchUnfocused(object sender, FocusEventArgs e)
    {
        ViewModel.IsSearchActive = false;
        ViewModel.HideSuggestions();
    }

    private void OnCancelSearch(object sender, EventArgs e)
    {
        ViewModel.SearchText = "";
        ViewModel.HideSuggestions();
        ViewModel.IsSearchActive = false;
        SearchEntry.Unfocus();
        LoadMap();
    }

    private async void OnSuggestionTapped(object sender, TappedEventArgs e)
    {
        if (e.Parameter is not POI poi)
            return;

        ViewModel.SelectPoi(poi);
        SearchEntry.Text = poi.Name;
        SearchEntry.Unfocus();
        ViewModel.IsSearchActive = false;
        ViewModel.HideSuggestions();

        MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
            new Location(poi.Latitude, poi.Longitude),
            Distance.FromMeters(300)
        ));

        await AnimateCard();
    }

    private async void OnDirectionClicked(object sender, EventArgs e)
    {
        if (ViewModel.SelectedPoi == null)
            return;


        var lat = ViewModel.SelectedPoi.Latitude.ToString(CultureInfo.InvariantCulture);
        var lng = ViewModel.SelectedPoi.Longitude.ToString(CultureInfo.InvariantCulture);

        var result = await DisplayActionSheet("Mở chỉ đường bằng", "Huỷ", null, "Apple Maps", "Google Maps");

        if (result == "Apple Maps")
        {
            var appleUrl = $"http://maps.apple.com/?daddr={lat},{lng}";
            await Launcher.Default.OpenAsync(appleUrl);
        }
        else if (result == "Google Maps")
        {
            var googleUrl = $"comgooglemaps://?daddr={lat},{lng}&directionsmode=driving";
            if (await Launcher.Default.CanOpenAsync(googleUrl))
            {
                await Launcher.Default.OpenAsync(googleUrl);
            }
            else
            {
                var webUrl = $"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}";
                await Launcher.Default.OpenAsync(webUrl);
            }
        }
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

    private async void OnCardTapped(object sender, TappedEventArgs e)
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

    private async Task FocusUserLocation()
    {
        var location = await Geolocation.GetLastKnownLocationAsync();

        if (location != null)
        {
            MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                new Location(location.Latitude, location.Longitude),
                Distance.FromMeters(800)
            ));
        }
    }
}