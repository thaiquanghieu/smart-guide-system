namespace SmartGuideApp.Config;

public static class AppEndpoints
{
    public const string ApiBaseUrl = "http://192.168.22.4:5022";

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
