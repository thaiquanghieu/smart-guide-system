using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SmartGuideApp.Pages;

public partial class RegisterPage : ContentPage
{
    public RegisterPage()
    {
        InitializeComponent();
    }

    private async void OnRegisterClicked(object sender, EventArgs e)
    {
        var userName = UserNameEntry.Text?.Trim();
        var email = EmailEntry.Text?.Trim();
        var password = PasswordEntry.Text;
        var confirmPassword = ConfirmPasswordEntry.Text;

        // =========================
        // VALIDATE
        // =========================
        if (string.IsNullOrWhiteSpace(userName) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            await DisplayAlert("Lỗi", "Nhập đầy đủ thông tin", "OK");
            return;
        }

        if (userName.Length < 3)
        {
            await DisplayAlert("Lỗi", "Tên phải >= 3 ký tự", "OK");
            return;
        }

        if (!IsValidEmail(email))
        {
            await DisplayAlert("Lỗi", "Email không hợp lệ", "OK");
            return;
        }

        if (password.Length < 6)
        {
            await DisplayAlert("Lỗi", "Mật khẩu phải >= 6 ký tự", "OK");
            return;
        }

        if (password != confirmPassword)
        {
            await DisplayAlert("Lỗi", "Mật khẩu nhập lại không khớp", "OK");
            return;
        }

        try
        {
            var client = new HttpClient();

            var json = JsonSerializer.Serialize(new
            {
                userName,
                email,
                password
            });

            var res = await client.PostAsync(
                "http://192.168.22.4:5022/api/auth/register",
                new StringContent(json, Encoding.UTF8, "application/json")
            );

            if (!res.IsSuccessStatusCode)
            {
                var msg = await res.Content.ReadAsStringAsync();
                await DisplayAlert("Lỗi", msg, "OK");
                return;
            }

            await DisplayAlert("Thành công", "Đăng ký thành công, hãy đăng nhập", "OK");

            // quay về login
            await Navigation.PopAsync();
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
    }

    private bool IsValidEmail(string email)
    {
        return Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
    }

    private async void OnGoLogin(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }

    private bool _isPasswordVisible = false;
    private bool _isConfirmPasswordVisible = false;

    private void OnTogglePassword(object sender, EventArgs e)
    {
        _isPasswordVisible = !_isPasswordVisible;

        var cursor = PasswordEntry.CursorPosition;

        PasswordEntry.IsPassword = !_isPasswordVisible;

        TogglePasswordIcon.Source = _isPasswordVisible
            ? "eye_open.png"
            : "eye_close.png";

        PasswordEntry.Focus();
        PasswordEntry.CursorPosition = cursor;
    }

    private void OnToggleConfirmPassword(object sender, EventArgs e)
    {
        _isConfirmPasswordVisible = !_isConfirmPasswordVisible;

        var cursor = ConfirmPasswordEntry.CursorPosition;

        ConfirmPasswordEntry.IsPassword = !_isConfirmPasswordVisible;

        ToggleConfirmPasswordIcon.Source = _isConfirmPasswordVisible
            ? "eye_open.png"
            : "eye_closed.png";

        ConfirmPasswordEntry.Focus();
        ConfirmPasswordEntry.CursorPosition = cursor;
    }
}