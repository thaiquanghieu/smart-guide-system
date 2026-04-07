using SmartGuideApp.ViewModels;
using SmartGuideApp.Views;

namespace SmartGuideApp.Views;

public partial class MapPage : ContentPage
{
    private MapViewModel ViewModel => (MapViewModel)BindingContext;

    public MapPage()
    {
        InitializeComponent();
    }

    private void OnPoi1Tapped(object? sender, TappedEventArgs e)
    {
        ViewModel.SelectPoi("1");
    }

    private void OnPoi2Tapped(object? sender, TappedEventArgs e)
    {
        ViewModel.SelectPoi("3");
    }

    private async void OnOpenDetailClicked(object sender, EventArgs e)
    {
        if (ViewModel.SelectedPoi is null)
            return;

        await Shell.Current.GoToAsync(nameof(DetailPage), new Dictionary<string, object>
        {
            { "Poi", ViewModel.SelectedPoi }
        });
    }
}