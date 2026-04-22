using System.Globalization;

namespace SmartGuideApp.Converters;

public class FavoriteIconConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var isFav = value is bool b && b;
        return isFav ? "favorite_active.png" : "favorite.png";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotImplementedException();
}