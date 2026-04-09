using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps;
using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;
using System.Globalization;
using Microsoft.Maui.Media;

namespace SmartGuideApp.Views;

[QueryProperty(nameof(PoiId), "poiId")]
public partial class MapPage : ContentPage
{
    private MapViewModel ViewModel => (MapViewModel)BindingContext;

    private string? _poiId;
    public string? PoiId
    {
        get => _poiId;
        set
        {
            _poiId = value;
            _pendingPoiId = value;
            _ = TryHandlePendingPoiAsync();
        }
    }

    private bool _isMapReady;
    private string? _pendingPoiId;

    private CancellationTokenSource? _mapAudioCts;
    private POI? _mapPlayingPoi;

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
        _isMapReady = true;

        if (!string.IsNullOrWhiteSpace(_pendingPoiId))
        {
            await TryHandlePendingPoiAsync();
        }
        else
        {
            await FocusUserLocation();
        }
    }

    private async Task TryHandlePendingPoiAsync()
    {
        if (!_isMapReady || string.IsNullOrWhiteSpace(_pendingPoiId))
            return;

        var poi = ViewModel.Pois.FirstOrDefault(x => x.Id == _pendingPoiId);
        if (poi == null)
            return;

        ViewModel.SelectPoi(poi);
        SearchEntry.Text = poi.Name;

        MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
            new Location(poi.Latitude, poi.Longitude),
            Distance.FromMeters(300)
        ));

        await AnimateCard();

        _pendingPoiId = null;
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
                if (poi == null) return;

                ViewModel.SelectPoi(poi);

                MainMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                    new Location(poi.Latitude, poi.Longitude),
                    Distance.FromMeters(300)
                ));

                SearchEntry?.Unfocus();

                await AnimateCard();

                e.HideInfoWindow = true;
            };

            MainMap.Pins.Add(pin);
        }
    }

    private void OnMapClicked(object sender, MapClickedEventArgs e)
    {
        StopMapAudio();
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

    private async void OnCancelSearch(object sender, EventArgs e)
    {
        StopMapAudio();
        ViewModel.SearchText = "";
        ViewModel.HideSuggestions();
        ViewModel.IsSearchActive = false;
        ViewModel.ClearSelection();
        SearchEntry.Unfocus();
        LoadMap();
        await FocusUserLocation();
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

    private void StopMapAudio()
    {
        _mapAudioCts?.Cancel();

        if (_mapPlayingPoi != null)
            _mapPlayingPoi.IsAudioPlaying = false;

        _mapPlayingPoi = null;
        _mapAudioCts = null;
    }

    private async void OnMapAudioTapped(object? sender, TappedEventArgs e)
    {
        var poi = ViewModel.SelectedPoi;
        if (poi == null)
            return;

        var script = poi.Audios.FirstOrDefault()?.ScriptText;
        if (string.IsNullOrWhiteSpace(script))
            return;

        if (_mapPlayingPoi == poi && poi.IsAudioPlaying)
        {
            StopMapAudio();
            return;
        }

        StopMapAudio();

        var cts = new CancellationTokenSource();
        _mapAudioCts = cts;
        _mapPlayingPoi = poi;
        poi.IsAudioPlaying = true;

        try
        {
            await TextToSpeech.SpeakAsync(
                script,
                new SpeechOptions
                {
                    Volume = 1.0f,
                    Pitch = 1.0f
                },
                cts.Token);
        }
        catch
        {
        }
        finally
        {
            if (_mapAudioCts == cts)
            {
                poi.IsAudioPlaying = false;
                _mapPlayingPoi = null;
                _mapAudioCts = null;
            }
        }
    }

    protected override void OnDisappearing()
    {
        StopMapAudio();
        base.OnDisappearing();
    }
}