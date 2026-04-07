using SmartGuideApp.Models;
using SmartGuideApp.ViewModels;

namespace SmartGuideApp.Views;

public partial class DetailPage : ContentPage, IQueryAttributable
{
    private DetailViewModel ViewModel => (DetailViewModel)BindingContext;

    public DetailPage()
    {
        InitializeComponent();
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
}