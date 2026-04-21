using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps;
using Microsoft.Maui.Media;
using SmartGuideApp.Services;

namespace SmartGuideApp.Views;

public partial class HomePage : ContentPage
{
    private HomeViewModel ViewModel => (HomeViewModel)BindingContext;

    bool isFilterActive = false;
    bool isSortActive = false;

    public HomePage()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();

        if (BindingContext is HomeViewModel vm)
        {
            _ = vm.Reload();
        }

        if (BindingContext is HomeViewModel vm2)
        {
            vm2.PropertyChanged -= OnViewModelPropertyChanged;
            vm2.PropertyChanged += OnViewModelPropertyChanged;
        }

        _ = LoadMapPreview();
    }

    private async void OnLoaded(object? sender, EventArgs e)
    {
        try
        {
            // Subscribe to ViewModel changes so we can refresh the mini-map when Pois are loaded
            if (BindingContext is HomeViewModel vm)
            {
                vm.PropertyChanged -= OnViewModelPropertyChanged;
                vm.PropertyChanged += OnViewModelPropertyChanged;
            }

            await LoadMapPreview();
        }
        catch
        {
        }
    }

    private void OnViewModelPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        // When the Pois collection is replaced/updated, refresh the preview map
        if (e.PropertyName == nameof(HomeViewModel.Pois))
        {
            // Fire-and-forget safe call to update UI
            _ = MainThread.InvokeOnMainThreadAsync(async () => await LoadMapPreview());
        }
    }

    private async Task LoadMapPreview()
    {
        try
        {
            if (PreviewMap == null) return;

            PreviewMap.Pins.Clear();

            foreach (var poi in ViewModel.Pois)
            {
                var pin = new Pin
                {
                    Label = poi.Name,
                    Location = new Location(poi.Latitude, poi.Longitude),
                    Type = PinType.Place
                };

                pin.MarkerClicked += async (s, e) =>
                {
                    e.HideInfoWindow = true;
                    await Shell.Current.GoToAsync($"///map?poiId={poi.Id}");
                };

                PreviewMap.Pins.Add(pin);
            }

            var location = await Geolocation.GetLastKnownLocationAsync();

            if (location != null)
            {
                PreviewMap.IsShowingUser = true;
                PreviewMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                    new Location(location.Latitude, location.Longitude),
                    Distance.FromMeters(800)
                ));
            }
        }
        catch
        {
        }
    }

    private async void OnMapClicked(object sender, MapClickedEventArgs e)
    {
        await Shell.Current.GoToAsync("//map");
    }

    private async void OnMyLocationClicked(object sender, EventArgs e)
    {
        try
        {
            var location = await Geolocation.GetLastKnownLocationAsync();

            if (location != null)
            {
                PreviewMap.IsShowingUser = true;
                PreviewMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                    new Location(location.Latitude, location.Longitude),
                    Distance.FromMeters(800)
                ));
            }
        }
        catch
        {
        }
    }

    private async void OnOpenDetailTapped(object? sender, TappedEventArgs e)
    {
        if (e.Parameter is POI poi)
        {
            await Shell.Current.GoToAsync(nameof(DetailPage), new Dictionary<string, object>
            {
                { "Poi", poi }
            });
        }
    }

    private async Task ShowToast(string message)
    {
        ToastText.Text = message;
        ToastView.IsVisible = true;
        ToastView.Opacity = 0;
        ToastView.TranslationY = -20;

        await Task.WhenAll(
            ToastView.FadeTo(1, 180),
            ToastView.TranslateTo(0, 0, 180)
        );

        await Task.Delay(2000);

        await Task.WhenAll(
            ToastView.FadeTo(0, 250),
            ToastView.TranslateTo(0, -20, 250)
        );

        ToastView.IsVisible = false;
    }

    private async void OnOpenMainDropdown(object sender, EventArgs e)
    {
        var result = await DisplayActionSheet("Chọn mục", "Huỷ", null,
            "Gần bạn", "Tất cả", "Miễn phí");

        if (!string.IsNullOrWhiteSpace(result) && result != "Huỷ")
        {
            MainOptionText.Text = result;
            ViewModel.SetFilter(result);
        }
    }

    private async void OnSortClicked(object sender, EventArgs e)
    {
        var result = await DisplayActionSheet("Sắp xếp", "Huỷ", null,
            "Khoảng cách ↑",
            "Khoảng cách ↓",
            "Nghe nhiều ↓",
            "Nghe nhiều ↑",
            "Tên A-Z",
            "Tên Z-A");

        if (!string.IsNullOrWhiteSpace(result) && result != "Huỷ")
        {
            isSortActive = true;

            SortIcon.Source = "sort_active.png";
            SortText.TextColor = Color.FromArgb("#0F5BD7");

            switch (result)
            {
                case "Khoảng cách ↑":
                    await ViewModel.SetSort("distance", true);
                    break;
                case "Khoảng cách ↓":
                    await ViewModel.SetSort("distance", false);
                    break;

                case "Nghe nhiều ↓":
                    await ViewModel.SetSort("listened", false);
                    break;
                case "Nghe nhiều ↑":
                    await ViewModel.SetSort("listened", true);
                    break;

                case "Tên A-Z":
                    await ViewModel.SetSort("name", true);
                    break;
                case "Tên Z-A":
                    await ViewModel.SetSort("name", false);
                    break;
            }
        }
        else
        {
            isSortActive = false;

            SortIcon.Source = "sort.png";
            SortText.TextColor = Color.FromArgb("#9CA3AF");
        }
    }

    private void OnSearchFocused(object sender, FocusEventArgs e)
    {
        ViewModel.IsSearchActive = true;
    }

    private async void OnSearchUnfocused(object sender, FocusEventArgs e)
    {
        // Tăng delay lên một chút để đảm bảo các thao tác click vào suggestion kịp ghi nhận
        await Task.Delay(200);

        // Kiểm tra nếu thực sự không còn focus vào ô nhập liệu thì mới ẩn
        if (!SearchEntry.IsFocused)
        {
            ViewModel.HideSuggestions();
            // Không nên set IsSearchActive = false ở đây vì user có thể chỉ đang xem kết quả filter
        }
    }

    private void OnCancelSearch(object sender, EventArgs e)
    {
        ViewModel.SearchText = "";
        // Chỉ set IsSearchActive = false khi thực sự cancel
        ViewModel.IsSearchActive = false;
        ViewModel.HideSuggestions();
        SearchEntry.Unfocus();
    }

    private async void OnSuggestionTapped(object sender, TappedEventArgs e)
    {
        if (e.Parameter is not POI poi)
            return;

        // Chỉ set IsSearchActive = false khi user chọn suggestion
        ViewModel.IsSearchActive = false;
        ViewModel.HideSuggestions();
        SearchEntry.Unfocus();
        // chuyển sang map + truyền poiId
        await Shell.Current.GoToAsync($"///map?poiId={poi.Id}");
    }

    protected override void OnDisappearing()
    {
        AudioService.Instance.Stop();

        if (BindingContext is HomeViewModel vm)
        {
            vm.PropertyChanged -= OnViewModelPropertyChanged;
        }

        base.OnDisappearing();
    }

    private async void OnHomeAudioTapped(object sender, TappedEventArgs e)
    {
        if (e.Parameter is not POI poi)
            return;

        // optimistic update so the home card shows the increment immediately
        try
        {
        }
        catch { }

        await AudioService.Instance.PlayAsync(poi);
    }

    async void OnFavoriteTapped(object? sender, TappedEventArgs e)
    {
        if (e.Parameter is POI poi)
        {
            var oldValue = poi.IsFavorite;
            poi.IsFavorite = !poi.IsFavorite;

            try
            {
                var api = new ApiService();
                await api.ToggleFavoriteAsync(poi.Id, poi.IsFavorite);
            }
            catch
            {
                poi.IsFavorite = oldValue;
                return;
            }

            if (poi.IsFavorite)
            {
                await ShowToast("Đã thêm vào yêu thích!");
            }
        }
    }
}
