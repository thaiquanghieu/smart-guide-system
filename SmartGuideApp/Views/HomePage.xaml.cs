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

        // Ensure we subscribe and attempt to load the preview map on Appearing as well
        if (BindingContext is HomeViewModel vm)
        {
            vm.PropertyChanged -= OnViewModelPropertyChanged;
            vm.PropertyChanged += OnViewModelPropertyChanged;
        }

        // Fire-and-forget; map UI updates on the main thread inside LoadMapPreview
        _ = LoadMapPreview();
    }

    private async void OnLoaded(object? sender, EventArgs e)
    {
        // Subscribe to ViewModel changes so we can refresh the mini-map when Pois are loaded
        if (BindingContext is HomeViewModel vm)
        {
            vm.PropertyChanged -= OnViewModelPropertyChanged;
            vm.PropertyChanged += OnViewModelPropertyChanged;
        }

        await LoadMapPreview();
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
                // Use absolute route to avoid Shell relative routing crash
                await Shell.Current.GoToAsync($"///map?poiId={poi.Id}");
            };

            PreviewMap.Pins.Add(pin);
        }

        var location = await Geolocation.GetLastKnownLocationAsync();

        if (location != null)
        {
            PreviewMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                new Location(location.Latitude, location.Longitude),
                Distance.FromMeters(800)
            ));
        }
    }

    private async void OnMapClicked(object sender, MapClickedEventArgs e)
    {
        await Shell.Current.GoToAsync("//map");
    }

    private async void OnMyLocationClicked(object sender, EventArgs e)
    {
        var location = await Geolocation.GetLastKnownLocationAsync();

        if (location != null)
        {
            PreviewMap.MoveToRegion(MapSpan.FromCenterAndRadius(
                new Location(location.Latitude, location.Longitude),
                Distance.FromMeters(800)
            ));
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

    private async void OnFavoriteTapped(object? sender, TappedEventArgs e)
    {
        if (e.Parameter is POI poi)
        {
            poi.IsFavorite = !poi.IsFavorite;

            if (poi.IsFavorite)
            {
                await ShowToast("Đã thêm vào yêu thích!");
            }
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
            "Gần bạn", "Tất cả", "Nổi bật", "Miễn phí");

        if (!string.IsNullOrWhiteSpace(result) && result != "Huỷ")
        {
            MainOptionText.Text = result;
            ViewModel.SetFilter(result);
        }
    }

    private async void OnFilterClicked(object sender, EventArgs e)
    {
        var result = await DisplayActionSheet("Chọn tỉnh/thành", "Huỷ", null,
            "Tất cả",
            "TP.HCM",
            "Hà Nội",
            "Đà Nẵng",
            "Hải Phòng",
            "Cần Thơ",

            "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
            "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
            "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
            "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
            "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
            "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
            "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
            "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
            "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
            "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
            "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
            "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
        );

        if (!string.IsNullOrWhiteSpace(result) && result != "Huỷ")
        {
            isFilterActive = result != "Tất cả";

            FilterIcon.Source = isFilterActive ? "filter_active.png" : "filter.png";
            FilterText.TextColor = isFilterActive ? Color.FromArgb("#0F5BD7") : Color.FromArgb("#9CA3AF");

            // (OPTIONAL - nếu bạn muốn filter thật)
            // ViewModel.SetLocationFilter(result);
        }
    }

    private async void OnSortClicked(object sender, EventArgs e)
    {
        var result = await DisplayActionSheet("Sắp xếp", "Huỷ", null,
            "Gần nhất",
            "Xa nhất",
            "Phổ biến",
            "Đã nghe nhiều",
            "Miễn phí");

        if (!string.IsNullOrWhiteSpace(result) && result != "Huỷ")
        {
            isSortActive = true;

            SortIcon.Source = "sort_active.png";
            SortText.TextColor = Color.FromArgb("#0F5BD7");
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

        await AudioService.Instance.PlayAsync(poi);
    }
}