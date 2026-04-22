using ZXing;
using ZXing.Common;
using System.Net.Http;
using SkiaSharp;

namespace SmartGuideApp.Pages;

public partial class ScanPage : ContentPage
{
    private bool _isScanning = true;

    public ScanPage()
    {
        InitializeComponent();
    }

    // =========================
    // HANDLE SCAN RESULT (DÙNG CHUNG)
    // =========================
    private async Task HandleScan(string code)
    {
        if (!_isScanning) return;

        _isScanning = false;

        try
        {
            var api = new ApiService();
            var device = await api.EnsureDeviceReadyAsync();
            if (!device.ok)
            {
                await DisplayAlert("Lỗi", device.message, "OK");
                _isScanning = true;
                return;
            }

            var result = await api.ScanPaymentAsync(code);

            if (!result.ok)
            {
                await DisplayAlert("Lỗi", result.message, "OK");

                _isScanning = true;
                return;
            }

            Preferences.Set("subscription_active", true);
            await DisplayAlert("Thành công", "Đã kích hoạt gói!", "OK");

            Application.Current!.MainPage = new AppShell();
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", ex.Message, "OK");
            _isScanning = true;
        }
    }

    // =========================
    // SCAN TỪ ẢNH (CHÍNH)
    // =========================
    private async void OnPickImageClicked(object sender, EventArgs e)
    {
        try
        {
            var photo = await MediaPicker.Default.PickPhotoAsync();

            if (photo == null) return;

            using var stream = await photo.OpenReadAsync();

            using var skBitmap = SKBitmap.Decode(stream);

            if (skBitmap == null)
            {
                await DisplayAlert("Lỗi", "Không đọc được ảnh", "OK");
                return;
            }

            var reader = new BarcodeReaderGeneric
            {
                Options = new DecodingOptions
                {
                    PossibleFormats = new[] { BarcodeFormat.QR_CODE },
                    TryHarder = true
                }
            };

            var luminance = new RGBLuminanceSource(
                skBitmap.Bytes,
                skBitmap.Width,
                skBitmap.Height,
                RGBLuminanceSource.BitmapFormat.RGBA32
            );

            var result = reader.Decode(luminance);

            if (result == null)
            {
                await DisplayAlert("Lỗi", "Không tìm thấy mã QR", "OK");
                return;
            }

            var code = result.Text;

            if (!code.StartsWith("SG_FREE"))
            {
                await DisplayAlert("Thông báo", "QR không hợp lệ", "OK");
                return;
            }

            await HandleScan(code);
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
    }

    // =========================
    // FAKE CAMERA CLICK (GIẢ LẬP)
    // =========================
    private async void OnFakeScanClicked(object sender, EventArgs e)
    {
        // dùng test nhanh không cần QR thật
        var fakeCode = "SG_FREE_TEST123";

        await HandleScan(fakeCode);
    }

    // =========================
    // BACK
    // =========================
    private async void OnBackTapped(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }
}
