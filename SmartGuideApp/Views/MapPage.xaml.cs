using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps;
using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;
using System.Globalization;
using Microsoft.Maui.Media;
using SmartGuideApp.Services;
using System.ComponentModel;

namespace SmartGuideApp.Views;

[QueryProperty(nameof(PoiId), "poiId")]
public partial class MapPage : ContentPage
{
    private MapViewModel ViewModel => (MapViewModel)BindingContext;
    private TrackingService _trackingService = new();
    private bool _isTrackingEnabled;

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

    public MapPage()
    {
        InitializeComponent();
        BindingContext = new MapViewModel();
        Loaded += OnLoaded;

        TrackingIcon.Source = "tracking.png";
        TrackingText.Text = "Tracking: OFF";
    }

    private async void OnLoaded(object? sender, EventArgs e)
    {
        // If the map was already initialized in OnAppearing, skip Loaded handler
        if (_isMapReady)
            return;
        await UpdateDistances();
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
        if (!_isMapReady || MainMap == null || string.IsNullOrWhiteSpace(_pendingPoiId))
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

    protected override void OnDisappearing()
    {
        AudioService.Instance.Stop();
        _trackingService.Stop();

        if (BindingContext is MapViewModel vm)
        {
            vm.PropertyChanged -= OnViewModelPropertyChanged;
        }

        base.OnDisappearing();
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        if (BindingContext is MapViewModel vm)
        {
            // ✅ LOAD API
            await vm.InitializeAsync();

            // ===== phần tracking cũ =====
            _isTrackingEnabled = Preferences.Get("tracking_enabled", false);

            UpdateTrackingUI();

            vm.PropertyChanged -= OnViewModelPropertyChanged;
            vm.PropertyChanged += OnViewModelPropertyChanged;

            // Ensure the map is populated after initialization. InitializeAsync may have
            // set FilteredPois already, so subscribe above then explicitly load the map
            // and update distances so pins appear immediately.
            LoadMap();

            await UpdateDistances();

            _isMapReady = true;

            if (!string.IsNullOrWhiteSpace(_pendingPoiId))
            {
                await TryHandlePendingPoiAsync();
            }
            else
            {
                await FocusUserLocation();
            }

            await UpdateTrackingPosition();

            if (_isTrackingEnabled)
            {
                await _trackingService.StartTrackingAsync(vm.Pois.ToList());
            }
        }
    }

    private void UpdateTrackingUI()
    {
        TrackingIcon.Source = _isTrackingEnabled
            ? "tracking_active.png"
            : "tracking.png";

        TrackingText.Text = _isTrackingEnabled
            ? "Tracking: ON"
            : "Tracking: OFF";
    }

    private async void OnTrackingTapped(object sender, EventArgs e)
    {
        _isTrackingEnabled = !_isTrackingEnabled;

        Preferences.Set("tracking_enabled", _isTrackingEnabled);
        UpdateTrackingUI();

        if (BindingContext is not MapViewModel vm)
            return;

        if (_isTrackingEnabled)
        {
            await _trackingService.StartTrackingAsync(vm.Pois.ToList());
        }
        else
        {
            _trackingService.Stop();
        }
    }

    private async void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MapViewModel.SelectedPoi))
        {
            await UpdateTrackingPosition();
        }

        if (e.PropertyName == nameof(MapViewModel.FilteredPois))
        {
            LoadMap();
        }
    }

    private async Task UpdateTrackingPosition()
    {
        if (TrackingButton == null)
            return;

        if (ViewModel.SelectedPoi != null)
        {
            // Có card hiện -> đẩy nút lên trên
            await TrackingButton.TranslateTo(0, -160, 200, Easing.CubicOut);
        }
        else
        {
            // Không có card -> trả về vị trí cũ
            await TrackingButton.TranslateTo(0, 50, 200, Easing.CubicOut);
        }
    }
    
    private async void OnMapAudioTapped(object sender, TappedEventArgs e)
    {
        if (ViewModel.SelectedPoi == null)
            return;

        await AudioService.Instance.PlayAsync(ViewModel.SelectedPoi);
    }
}