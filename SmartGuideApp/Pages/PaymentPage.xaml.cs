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
            var client = new HttpClient();
            var userId = Preferences.Get("user_id", 0);

            if (userId == 0)
            {
                await DisplayAlert("Lỗi", "Bạn chưa đăng nhập.", "OK");
                return;
            }

            var url = $"http://192.168.22.4:5022/api/payments/create?userId={userId}&planId={_planId}";

            var res = await client.PostAsync(url, null);
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
            {
                await DisplayAlert("Lỗi", json, "OK");
                return;
            }

            using var doc = System.Text.Json.JsonDocument.Parse(json);

            // ===== CODE =====
            _paymentCode = doc.RootElement.GetProperty("code").GetString()!;

            // ===== PLAN (TỪ DB) =====
            var plan = doc.RootElement.GetProperty("plan");

            var name = plan.GetProperty("name").GetString();
            var days = plan.GetProperty("days").GetInt32();
            var price = plan.GetProperty("price").GetInt32();

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
            var client = new HttpClient();
            var userId = Preferences.Get("user_id", 0);

            if (userId == 0)
            {
                await DisplayAlert("Lỗi", "Bạn chưa đăng nhập.", "OK");
                return;
            }

            var url = $"http://192.168.22.4:5022/api/payments/scan?code={_paymentCode}&userId={userId}";

            var res = await client.PostAsync(url, null);

            if (!res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();

                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var message = doc.RootElement.GetProperty("message").GetString();

                    await DisplayAlert("Lỗi", message, "OK");
                }
                catch
                {
                    await DisplayAlert("Lỗi", json, "OK");
                }

                return;
            }

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