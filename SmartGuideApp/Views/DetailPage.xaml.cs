using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;

namespace SmartGuideApp.Views;

public partial class DetailPage : ContentPage, IQueryAttributable
{
    private DetailViewModel ViewModel => (DetailViewModel)BindingContext;

    public DetailPage()
    {
        InitializeComponent();
        BindingContext = new DetailViewModel();
    }

    public void ApplyQueryAttributes(IDictionary<string, object> query)
    {
        // 👉 nhận từ deep link (QR)
        if (query.TryGetValue("poiId", out var idObj))
        {
            var id = idObj?.ToString();

            if (!string.IsNullOrEmpty(id))
            {
                System.Diagnostics.Debug.WriteLine($"Deep link POI ID: {id}");

                // TODO: sau này load từ global store
            }
        }

        // 👉 nhận từ navigate bình thường (Home/Map)
        else if (query.TryGetValue("Poi", out var poiObject) && poiObject is POI poi)
        {
            ViewModel.Poi = poi;
        }
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await Shell.Current.GoToAsync("..");
    }

    private async void OnShareTapped(object? sender, TappedEventArgs e)
    {
        if (ViewModel.Poi == null)
            return;

        var link = $"smartguide://poi?id={ViewModel.Poi.Id}";

        await Share.Default.RequestAsync(new ShareTextRequest
        {
            Title = ViewModel.Title,
            Text = link
        });
    }

    private async void OnShowScriptClicked(object sender, EventArgs e)
    {
        await DisplayAlert("Lời thuyết minh", ViewModel.ScriptText, "Đóng");
    }

    private void OnAudioTapped(object? sender, TappedEventArgs e)
    {
        if (ViewModel.TogglePlayCommand.CanExecute(null))
            ViewModel.TogglePlayCommand.Execute(null);
    }

    private void OnTimelineDragCompleted(object? sender, EventArgs e)
    {
        if (sender is Slider slider && ViewModel.SeekCommand.CanExecute(slider.Value))
            ViewModel.SeekCommand.Execute(slider.Value);
    }

    private async void OnFavoriteTapped(object? sender, TappedEventArgs e)
    {
        if (ViewModel.ToggleFavoriteCommand.CanExecute(null))
            ViewModel.ToggleFavoriteCommand.Execute(null);

        if (ViewModel.IsFavorite)
        {
            await ShowToast("Đã thêm vào yêu thích!");
        }
    }

    private async void OnShowOnMapClicked(object sender, EventArgs e)
    {
        if (ViewModel.Poi == null || string.IsNullOrEmpty(ViewModel.Poi.Id))
            return;

        // Sử dụng Dictionary để truyền dữ liệu an toàn
        var navigationParameters = new Dictionary<string, object>
        {
            { "poiId", ViewModel.Poi.Id }
        };

        try
        {
            // Trỏ chính xác về Route="map" đã khai báo trong AppShell.xaml
            await Shell.Current.GoToAsync("//map", navigationParameters);
        }
        catch (Exception ex)
        {
            // Bắt lỗi để app không bị crash (văng app) nếu có sự cố về routing
            System.Diagnostics.Debug.WriteLine($"Lỗi Navigation: {ex.Message}");
            await DisplayAlert("Lỗi", "Không thể chuyển sang bản đồ lúc này.", "OK");
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

    protected override void OnAppearing()
    {
        base.OnAppearing();

        var isAutoPlay = Preferences.Get("auto_play", false);

        if (isAutoPlay && ViewModel.TogglePlayCommand.CanExecute(null))
        {
            ViewModel.TogglePlayCommand.Execute(null);
        }
    }

    protected override void OnDisappearing()
    {
        if (ViewModel.IsPlaying && ViewModel.TogglePlayCommand.CanExecute(null))
        {
            ViewModel.TogglePlayCommand.Execute(null);
        }

        base.OnDisappearing();
    }

    private string _qrLink = "";
    private void OnShowQrTapped(object sender, EventArgs e)
    {
        if (ViewModel.Poi == null)
            return;

        _qrLink = $"smartguide://poi?id={ViewModel.Poi.Id}";

        QrLinkLabel.Text = "Link: " + _qrLink;

        // 👉 tạm thời dùng ảnh QR online (demo nhanh)
        QrImage.Source = $"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={Uri.EscapeDataString(_qrLink)}";

        QrPopup.IsVisible = true;
    }

    private async void OnCopyLinkTapped(object sender, EventArgs e)
    {
        await Clipboard.Default.SetTextAsync(_qrLink);
        await DisplayAlert("OK", "Đã sao chép link", "OK");
    }

    private async void OnSaveQrTapped(object sender, EventArgs e)
    {
        await DisplayAlert("Info", "Tính năng lưu sẽ làm sau (cần xử lý file)", "OK");
    }

    private void OnCloseQrClicked(object sender, EventArgs e)
    {
        QrPopup.IsVisible = false;
    }
}