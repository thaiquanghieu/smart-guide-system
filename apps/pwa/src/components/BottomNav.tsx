import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAppI18n } from "@/lib/i18n";
import { Route } from "lucide-react";

const items = [
  { href: "/", labelKey: "nav.home", icon: "home.png", activeIcon: "home_active.png" },
  { href: "/tours", labelKey: "nav.tours", lucideIcon: Route },
  { href: "/map", labelKey: "nav.map", icon: "map.png", activeIcon: "map_active.png" },
  { href: "/profile", labelKey: "nav.profile", icon: "account.png", activeIcon: "account_active.png" },
];

export default function BottomNav() {
  const router = useRouter();
  const { t } = useAppI18n();

  useEffect(() => {
    void Promise.all(items.map((item) => router.prefetch(item.href)));
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#E5E7EB] bg-white pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex w-full max-w-[540px] items-center justify-around px-6">
        {items.map((item) => {
          const active = router.pathname === item.href;
          const LucideIcon = item.lucideIcon;

          return (
            <Link key={item.href} href={item.href} scroll={false} className="flex min-w-[72px] flex-col items-center gap-1 py-[6px]">
              {LucideIcon ? (
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? "text-[#0F5BD7]" : "text-[#9CA3AF]"}`}>
                  <LucideIcon className="h-5 w-5" strokeWidth={2.2} />
                </div>
              ) : (
                <img
                  src={`/assets/${active ? item.activeIcon : item.icon}`}
                  alt={t(item.labelKey)}
                  className="h-6 w-6 object-contain"
                />
              )}
              <span
                className={`text-[12px] ${active ? "font-semibold text-[#0F5BD7]" : "text-[#9CA3AF]"}`}
                suppressHydrationWarning
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
