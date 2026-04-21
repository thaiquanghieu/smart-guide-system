namespace SmartGuideApp.Pages;

public partial class PaymentPage : ContentPage
{
    private readonly int _planId;
    private string _paymentCode = "";

    public PaymentPage(int planId)
    {
        InitializeComponent();
        _planId = planId;

        _ = LoadQRAsync();
    }

    // =========================
    // LOAD DATA TỪ BACKEND
    // =========================
    private async Task LoadQRAsync()
    {
        try
        {
            var api = new ApiService();
            var device = await api.EnsureDeviceReadyAsync();

            if (!device.ok)
            {
                await DisplayAlert("Lỗi", device.message, "OK");
                return;
            }

            var (payment, message) = await api.CreatePaymentAsync(_planId);
            if (payment == null || string.IsNullOrWhiteSpace(payment.Code))
            {
                await DisplayAlert("Lỗi", message, "OK");
                return;
            }

            // ===== CODE =====
            _paymentCode = payment.Code;

            // ===== PLAN (TỪ DB) =====
            var name = payment.Plan.Name;
            var days = payment.Plan.Days;
            var price = payment.Plan.Price;

            // ===== UI =====
            PlanNameLabel.Text = name;
            PlanDaysLabel.Text = $"/{days} ngày";
            PlanPriceLabel.Text = $"{price:N0} đ";

            ApplyPlanStyle(price);

            // ===== QR =====
            var vietQrUrl =
                $"https://img.vietqr.io/image/TCB-4001012005-compact2.png?amount={price}&addInfo={_paymentCode}&accountName=THAI%20QUANG%20HIEU";

            QrImage.Source = vietQrUrl;

            // ===== NỘI DUNG CK =====
            TransferContentLabel.Text = _paymentCode;
            LoadingLabel.IsVisible = false;
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
    }

    // =========================
    // STYLE THEO PLAN
    // =========================
    private void ApplyPlanStyle(int price)
    {
        if (price == 999000)
        {
            // GÓI NĂM
            PlanCard.BackgroundColor = Color.FromArgb("#0F5BD7");
            PlanCard.BorderColor = Color.FromArgb("#4C8FF1");

            PlanNameLabel.TextColor = Color.FromArgb("#EAF3FF");
            PlanDaysLabel.TextColor = Color.FromArgb("#D6E8FF");
            PlanPriceLabel.TextColor = Colors.White;
        }
        else if (price == 199000)
        {
            // GÓI THÁNG
            PlanCard.BackgroundColor = Color.FromArgb("#E9F2FF");
            PlanCard.BorderColor = Color.FromArgb("#9CC2FF");

            PlanPriceLabel.TextColor = Color.FromArgb("#0F5BD7");
        }
        else
        {
            // GÓI NGÀY + TUẦN
            PlanCard.BackgroundColor = Color.FromArgb("#F4F9FF");
            PlanCard.BorderColor = Color.FromArgb("#B9D8FF");

            PlanPriceLabel.TextColor = Color.FromArgb("#0F5BD7");
        }
    }

    // =========================
    // CONFIRM THANH TOÁN
    // =========================
    private async void OnConfirmPaidClicked(object sender, EventArgs e)
    {
        if (string.IsNullOrWhiteSpace(_paymentCode))
        {
            await DisplayAlert("Lỗi", "Chưa tạo được mã thanh toán.", "OK");
            return;
        }

        try
        {
            var api = new ApiService();
            var device = await api.EnsureDeviceReadyAsync();

            if (!device.ok)
            {
                await DisplayAlert("Lỗi", device.message, "OK");
                return;
            }

            var result = await api.ScanPaymentAsync(_paymentCode);
            if (!result.ok)
            {
                await DisplayAlert("Lỗi", result.message, "OK");
                return;
            }

            Preferences.Set("subscription_active", true);
            await DisplayAlert("Thành công", "Gói của bạn đã được kích hoạt.", "OK");

            // 👉 vào app
            Application.Current!.MainPage = new AppShell();
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
    }

    // =========================
    // BACK
    // =========================
    private async void OnBackTapped(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }

}
