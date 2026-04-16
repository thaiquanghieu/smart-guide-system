using System;
using System.Globalization;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;

namespace SmartGuideApp.Converters
{
    public class BoolToColorConverter : IValueConverter
    {
        // Colors can be overridden via XAML if desired
        public string TrueColor { get; set; } = "#0F5BD7";
        public string FalseColor { get; set; } = "#9CA3AF";

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            bool flag = false;
            if (value is bool b) flag = b;

            try
            {
                return Color.FromArgb(flag ? TrueColor : FalseColor);
            }
            catch
            {
                // fallback to simple colors
                return flag ? Colors.Blue : Colors.Gray;
            }
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}
