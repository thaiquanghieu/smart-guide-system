using SmartGuideApp.ViewModels;

namespace SmartGuideApp.Views;

public partial class MapPage : ContentPage
{
    private MapViewModel ViewModel => (MapViewModel)BindingContext;

    public MapPage()
    {
        InitializeComponent();
    }

    private async Task AnimateSelect(Frame selected, Frame other)
    {
        await Task.WhenAll(
            selected.ScaleTo(1.4, 120, Easing.CubicOut),
            other.ScaleTo(1, 120, Easing.CubicOut)
        );
    }

    private async Task ResetScale()
    {
        await Task.WhenAll(
            Poi1.ScaleTo(1, 120),
            Poi2.ScaleTo(1, 120)
        );
    }

    private async void OnPoi1Tapped(object sender, EventArgs e)
    {
        if (ViewModel.SelectedPoi?.Id == "1")
        {
            ViewModel.SelectedPoi = null;
            await ResetScale();
        }
        else
        {
            ViewModel.SelectPoi("1");
            await AnimateSelect(Poi1, Poi2);
        }
    }

    private async void OnPoi2Tapped(object sender, EventArgs e)
    {
        if (ViewModel.SelectedPoi?.Id == "3")
        {
            ViewModel.SelectedPoi = null;
            await ResetScale();
        }
        else
        {
            ViewModel.SelectPoi("3");
            await AnimateSelect(Poi2, Poi1);
        }
    }

    private async void OnMapTapped(object sender, EventArgs e)
    {
        ViewModel.SelectedPoi = null;
        await ResetScale();
    }

    private void OnSearchFocused(object sender, FocusEventArgs e)
    {
        #if IOS
                    ((Entry)sender).CursorPosition = 0;
        #endif
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
}