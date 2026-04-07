using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;

namespace SmartGuideApp.Views;

public partial class HomePage : ContentPage
{
    private HomeViewModel ViewModel => (HomeViewModel)BindingContext;

    bool isFilterActive = false;
    bool isSortActive = false;

    public HomePage()
    {
        InitializeComponent();
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

            if (sender is Frame frame && frame.Content is Image iconImage)
            {
                iconImage.Source = poi.IsFavorite ? "favorite_active.png" : "favorite.png";
            }

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
            "Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Hải Phòng",
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
            "Vĩnh Long", "Vĩnh Phúc", "Yên Bái");

        if (!string.IsNullOrWhiteSpace(result) && result != "Huỷ")
        {
            isFilterActive = true;
            FilterIcon.Source = "filter_active.png";
            FilterText.TextColor = Color.FromArgb("#0F5BD7");
        }
        else
        {
            isFilterActive = false;
            FilterIcon.Source = "filter.png";
            FilterText.TextColor = Color.FromArgb("#9CA3AF");
        }
    }

    private async void OnSortClicked(object sender, EventArgs e)
    {
        var result = await DisplayActionSheet("Sắp xếp", "Huỷ", null,
            "Gần nhất",
            "Xa nhất",
            "Phổ biến",
            "Đánh giá cao");

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
}