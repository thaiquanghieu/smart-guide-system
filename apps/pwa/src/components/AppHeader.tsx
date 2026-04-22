import { useAppI18n } from "@/lib/i18n";

type AppHeaderProps = {
  showMenu?: boolean;
  showNotification?: boolean;
  actionLabel?: string;
  onActionClick?: () => void;
};

export default function AppHeader({
  showMenu = false,
  showNotification = false,
  actionLabel,
  onActionClick,
}: AppHeaderProps) {
  const { t } = useAppI18n();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex h-[42px] w-[42px] items-center justify-center">
        {showMenu ? <img src="/assets/menu.png" alt="Menu" className="h-7 w-7" /> : null}
      </div>

      <h1 className="text-[25px] font-bold text-[#0B63E5]" suppressHydrationWarning>
        {t("app.title")}
      </h1>

      <div className="flex h-[42px] min-w-[42px] items-center justify-end">
        {actionLabel ? (
          <button
            type="button"
            onClick={onActionClick}
            className="rounded-[14px] bg-[#0F5BD7] px-3 py-[6px] text-[13px] font-bold text-white"
          >
            {actionLabel}
          </button>
        ) : null}

        {showNotification ? (
          <div className="relative flex h-[42px] w-[42px] items-center justify-center">
            <img src="/assets/notifications.png" alt="Notifications" className="h-[26px] w-[26px]" />
            <div className="absolute right-0 top-0 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#FF3B30] text-[10px] font-bold text-white">
              1
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
