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

    private async void OnDirectionClicked(object sender, EventArgs e)
    {
        if (ViewModel.Poi == null)
            return;

        var lat = ViewModel.Poi.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var lng = ViewModel.Poi.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);

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
}