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
        if (query.TryGetValue("Poi", out var poiObject) && poiObject is POI poi)
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

        await Share.Default.RequestAsync(new ShareTextRequest
        {
            Title = ViewModel.Title,
            Subject = ViewModel.Title,
            Text = $"{ViewModel.Title}\n{ViewModel.Address}",
            Uri = ViewModel.CurrentShareImageUrl
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
}