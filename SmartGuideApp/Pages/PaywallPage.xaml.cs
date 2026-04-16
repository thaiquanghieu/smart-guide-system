namespace SmartGuideApp.Pages;

public partial class PaywallPage : ContentPage
{
    private bool _showBack;

    public PaywallPage(bool showBack = false)
    {
        InitializeComponent();
        _showBack = showBack;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();

        BackButton.IsVisible = _showBack;
    }

    private async void OnBackTapped(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }

    private async void OnPlanClicked(object sender, EventArgs e)
    {
        if (sender is Frame frame)
        {
            var tap = frame.GestureRecognizers.FirstOrDefault() as TapGestureRecognizer;

            if (tap?.CommandParameter != null)
            {
                int planId = int.Parse(tap.CommandParameter.ToString()!);
                await Navigation.PushAsync(new PaymentPage(planId));
            }
        }
    }

    private async void OnScanClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new ScanPage());
    }

    private async void OnShowGuideClicked(object sender, EventArgs e)
    {
        await DisplayAlert(
            "Hướng dẫn",
            "Chúng tôi có đặt các QR ưu đãi ở khắp nơi, khi thấy bạn nhanh tay quét nó để được dùng miễn phí 7 ngày.",
            "OK");
    }
}