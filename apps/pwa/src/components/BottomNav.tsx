import Link from "next/link";
import { useRouter } from "next/router";

const items = [
  { href: "/", label: "Trang chủ", icon: "home.png", activeIcon: "home_active.png" },
  { href: "/map", label: "Bản đồ", icon: "map.png", activeIcon: "map_active.png" },
  { href: "/profile", label: "Hồ sơ", icon: "account.png", activeIcon: "account_active.png" },
];

export default function BottomNav() {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#E5E7EB] bg-white/95 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[540px] items-center justify-around px-6">
        {items.map((item) => {
          const active = router.pathname === item.href;

          return (
            <Link key={item.href} href={item.href} scroll={false} className="flex min-w-[72px] flex-col items-center gap-1 py-[6px]">
              <img
                src={`/assets/${active ? item.activeIcon : item.icon}`}
                alt={item.label}
                className="h-6 w-6 object-contain"
              />
              <span className={`text-[12px] ${active ? "font-semibold text-[#0F5BD7]" : "text-[#9CA3AF]"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
