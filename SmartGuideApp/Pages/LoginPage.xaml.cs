using System.Text;
using System.Text.Json;

namespace SmartGuideApp.Pages;

public partial class LoginPage : ContentPage
{
    public LoginPage()
    {
        InitializeComponent();
    }

    private async void OnLoginClicked(object sender, EventArgs e)
    {
        var input = InputEntry.Text;
        var password = PasswordEntry.Text;

        // ✅ check trước khi gọi API
        if (string.IsNullOrWhiteSpace(input) || string.IsNullOrWhiteSpace(password))
        {
            await DisplayAlert("Lỗi", "Nhập đầy đủ thông tin", "OK");
            return;
        }

        try
        {
            var client = new HttpClient();

            var json = JsonSerializer.Serialize(new
            {
                input,
                password
            });

            var res = await client.PostAsync(
                "http://172.20.10.3:5022/api/auth/login",
                new StringContent(json, Encoding.UTF8, "application/json")
            );

            if (!res.IsSuccessStatusCode)
            {
                var msg = await res.Content.ReadAsStringAsync();
                await DisplayAlert("Lỗi", msg, "OK");
                return;
            }

            var content = await res.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(content);
            var userId = doc.RootElement.GetProperty("userId").GetInt32();

            // ✅ lưu user
            Preferences.Set("user_id", userId);

            // =========================
            // CHECK SUB NGAY SAU LOGIN
            // =========================

            var checkRes = await client.GetAsync(
                $"http://172.20.10.3:5022/api/payments/check?userId={userId}");

            var checkJson = await checkRes.Content.ReadAsStringAsync();
            var checkDoc = JsonDocument.Parse(checkJson);

            bool isActive = false;

            if (checkDoc.RootElement.TryGetProperty("isActive", out var activeProp))
            {
                isActive = activeProp.GetBoolean();
            }

            // =========================
            // NAVIGATION
            // =========================

            if (isActive)
                Application.Current!.MainPage = new AppShell();
            else
                Application.Current!.MainPage = new NavigationPage(new PaywallPage(false));
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
    }

    private async void OnGoRegister(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new RegisterPage());
    }

    private bool _isPasswordVisible = false;

    private void OnTogglePassword(object sender, EventArgs e)
    {
        _isPasswordVisible = !_isPasswordVisible;

        PasswordEntry.IsPassword = !_isPasswordVisible;

        TogglePasswordIcon.Source = _isPasswordVisible
            ? "eye_open.png"
            : "eye_close.png";

        PasswordEntry.Focus();
    }
}