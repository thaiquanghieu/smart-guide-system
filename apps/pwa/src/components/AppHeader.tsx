import { Bell, ChevronLeft, Menu, QrCode, Share2 } from "lucide-react";
import { useAppI18n } from "@/lib/i18n";

type AppHeaderProps = {
  leftIcon?: "menu" | "qr" | "back";
  rightIcon?: "notification" | "share";
  onLeftClick?: () => void;
  onRightClick?: () => void;
  actionLabel?: string;
  onActionClick?: () => void;
  title?: string;
};

export default function AppHeader({
  leftIcon,
  rightIcon,
  onLeftClick,
  onRightClick,
  actionLabel,
  onActionClick,
  title,
}: AppHeaderProps) {
  const { t } = useAppI18n();

  const renderSideIcon = (icon?: "menu" | "qr" | "back" | "notification" | "share") => {
    if (icon === "menu") return <Menu className="h-6 w-6 text-[#0F5BD7]" strokeWidth={2.2} />;
    if (icon === "qr") return <QrCode className="h-6 w-6 text-[#0F5BD7]" strokeWidth={2.2} />;
    if (icon === "back") return <ChevronLeft className="h-7 w-7 text-[#0F5BD7]" strokeWidth={2.4} />;
    if (icon === "share") return <Share2 className="h-5 w-5 text-[#0F5BD7]" strokeWidth={2.2} />;
    if (icon === "notification") return <Bell className="h-6 w-6 text-[#0F5BD7]" strokeWidth={2.2} />;
    return null;
  };

  return (
    <div className="relative flex min-h-[46px] items-center justify-between">
      <div className="flex h-[46px] w-[46px] items-center justify-center">
        {leftIcon ? (
          <button
            type="button"
            aria-label={leftIcon}
            onClick={onLeftClick}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/80 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
          >
            {renderSideIcon(leftIcon)}
          </button>
        ) : null}
      </div>

      <h1
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center text-[22px] font-bold text-[#0F5BD7]"
        suppressHydrationWarning
      >
        {title || t("app.title")}
      </h1>

      <div className="flex h-[46px] min-w-[46px] items-center justify-end">
        {actionLabel ? (
          <button
            type="button"
            onClick={onActionClick}
            className="rounded-[14px] bg-[#0F5BD7] px-3 py-[6px] text-[13px] font-bold text-white"
          >
            {actionLabel}
          </button>
        ) : null}

        {!actionLabel && rightIcon ? (
          <button
            type="button"
            aria-label={rightIcon}
            onClick={onRightClick}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/80 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
          >
            {renderSideIcon(rightIcon)}
          </button>
        ) : null}
      </div>
    </div>
  );
}
