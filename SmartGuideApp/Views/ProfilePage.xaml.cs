using Microsoft.Maui.Storage;
using SmartGuideApp.ViewModels;
using SmartGuideApp.Pages;

namespace SmartGuideApp.Views;

public partial class ProfilePage : ContentPage
{
    double _userRadius = 0.2;
    int _userInterval = 5000;

    public ProfilePage()
    {
        InitializeComponent();
    }

    private void OnAutoPlayToggled(object sender, ToggledEventArgs e)
    {
        Preferences.Set("auto_play", e.Value);
    }

    private void OnOpenSettingsTapped(object sender, EventArgs e)
    {
        // đảm bảo default nếu chưa có
        if (!Preferences.ContainsKey("tracking_radius"))
            Preferences.Set("tracking_radius", 0.2);

        if (!Preferences.ContainsKey("tracking_interval"))
            Preferences.Set("tracking_interval", 5000);
        var isAuto = Preferences.Get("auto_play", false);

        AutoPlaySwitch.IsToggled = isAuto;

        // ===== LOAD TRACKING SETTINGS =====
        var isSaver = Preferences.Get("battery_saver", false);
        BatterySaverSwitch.IsToggled = isSaver;

        // nếu đang bật saver → dùng preset
        double radius = isSaver ? 0.3 : Preferences.Get("tracking_radius", 0.2);
        int interval = isSaver ? 10000 : Preferences.Get("tracking_interval", 5000);

        // set picker
        RadiusSlider.Value = radius switch
        {
            0.1 => 0,
            0.2 => 1,
            0.3 => 2,
            _ => 1
        };

        IntervalSlider.Value = interval switch
        {
            2000 => 0,
            5000 => 1,
            10000 => 2,
            _ => 1
        };

        // disable nếu saver ON
        RadiusSlider.IsEnabled = !isSaver;
        IntervalSlider.IsEnabled = !isSaver;

        UpdateTrackingStatus();

        SettingsPopup.IsVisible = true;

        UpdateSliderLabels();
    }

    private void OnCloseSettingsClicked(object sender, EventArgs e)
    {
        SettingsPopup.IsVisible = false;
    }

    private void OnBatterySaverToggled(object sender, ToggledEventArgs e)
    {
        Preferences.Set("battery_saver", e.Value);

        if (e.Value)
        {
            // SAVE user current
            if (!_userRadius.Equals(0.3))
            {
                _userRadius = Preferences.Get("tracking_radius", 0.2);
                _userInterval = Preferences.Get("tracking_interval", 5000);
            }

            // APPLY preset
            Preferences.Set("tracking_radius", 0.3);
            Preferences.Set("tracking_interval", 10000);

            RadiusSlider.Value = 2;
            IntervalSlider.Value = 2;
        }
        else
        {
            // RESTORE user
            Preferences.Set("tracking_radius", _userRadius);
            Preferences.Set("tracking_interval", _userInterval);

            RadiusSlider.Value = _userRadius switch
            {
                0.1 => 0,
                0.2 => 1,
                0.3 => 2,
                _ => 1
            };

            IntervalSlider.Value = _userInterval switch
            {
                2000 => 0,
                5000 => 1,
                10000 => 2,
                _ => 1
            };
        }

        RadiusSlider.IsEnabled = !e.Value;
        IntervalSlider.IsEnabled = !e.Value;

        UpdateSliderLabels();
        UpdateTrackingStatus();
    }



    private void UpdateTrackingStatus()
    {
        var radius = Preferences.Get("tracking_radius", 0.2);
        var interval = Preferences.Get("tracking_interval", 5000);

        int radiusM = (int)(radius * 1000);
        int seconds = interval / 1000;

        TrackingStatusLabel.Text = $"Đang dùng: {radiusM}m / {seconds} giây";
    }

    private int Snap(double value)
    {
        return (int)Math.Round(value);
    }

    // Radius slider: Khoảng cách tracking
    private void OnRadiusSliderChanged(object sender, ValueChangedEventArgs e)
    {
        int index = Snap(e.NewValue);
        RadiusSlider.Value = index; // snap UI

        double radius = index switch
        {
            0 => 0.1,
            1 => 0.2,
            2 => 0.3,
            _ => 0.2
        };

        _userRadius = radius;
        Preferences.Set("tracking_radius", radius);

        UpdateSliderLabels();
        UpdateTrackingStatus();
    }

    // Interval slider: Tần suất tracking
    private void OnIntervalSliderChanged(object sender, ValueChangedEventArgs e)
    {
        int index = Snap(e.NewValue);
        IntervalSlider.Value = index;

        int interval = index switch
        {
            0 => 2000,
            1 => 5000,
            2 => 10000,
            _ => 5000
        };

        _userInterval = interval;
        Preferences.Set("tracking_interval", interval);

        UpdateSliderLabels();
        UpdateTrackingStatus();
    }

    private void UpdateSliderLabels()
    {
        int r = (int)(Preferences.Get("tracking_radius", 0.2) * 1000);
        int t = Preferences.Get("tracking_interval", 5000) / 1000;

        RadiusValueLabel.Text = $"{r}m";
        IntervalValueLabel.Text = $"{t} giây";
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        if (BindingContext is ProfileViewModel vm)
        {
            await vm.RefreshAsync();
        }
    }

    private async void OnGoToPaywall(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new PaywallPage(true));
    }

    private async void OnLogoutClicked(object sender, EventArgs e)
    {
        bool confirm = await DisplayAlert(
            "Đăng ký lại thiết bị",
            "Thao tác này sẽ xóa mã thiết bị đang lưu trên máy và kiểm tra lại quyền truy cập từ đầu. Bạn muốn tiếp tục chứ?",
            "Tiếp tục",
            "Hủy");

        if (!confirm) return;

        Preferences.Remove("device_id");
        Preferences.Remove("device_uuid");
        Preferences.Remove("subscription_active");
        Preferences.Remove("tracking_enabled");

        if (Application.Current is App app)
        {
            await app.RestartDeviceFlowAsync();
        }
        else
        {
            Application.Current!.MainPage = new LoadingPage();
        }
    }
}
