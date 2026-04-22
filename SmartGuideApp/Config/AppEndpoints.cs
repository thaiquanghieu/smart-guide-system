namespace SmartGuideApp.Config;

public static class AppEndpoints
{
    // Dán URL public của ngrok hoặc host API vào đây, ví dụ:
    // https://abc123.ngrok-free.app
    public const string ApiBaseUrl = "https://comrade-matter-shell.ngrok-free.dev";

    public static string BuildApiUrl(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return ApiBaseUrl;

        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return path;
        }

        return $"{ApiBaseUrl.TrimEnd('/')}/{path.TrimStart('/')}";
    }
}
