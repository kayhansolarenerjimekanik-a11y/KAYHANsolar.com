"use client";

import {
  BarChart3,
  Bell,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareText,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const items: NavItem[] = [
  { href: "/kayhan-yonetim", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/kayhan-yonetim/bildirimler", label: "Bildirimler", icon: Bell },
  { href: "/kayhan-yonetim/urunler", label: "Ürünler", icon: Package },
  { href: "/kayhan-yonetim/kategoriler", label: "Kategoriler", icon: Tag },
  { href: "/kayhan-yonetim/kampanyalar", label: "Kampanyalar", icon: Sparkles },
  { href: "/kayhan-yonetim/teklifler", label: "Teklifler", icon: MessageSquareText },
  { href: "/kayhan-yonetim/siparisler", label: "Siparişler", icon: ShoppingBag },
  { href: "/kayhan-yonetim/galeri", label: "Galeri", icon: ImageIcon },
  { href: "/kayhan-yonetim/ai-egitim", label: "AI Eğitim", icon: Wand2 },
  { href: "/kayhan-yonetim/analitik", label: "Analitik", icon: BarChart3 },
  { href: "/kayhan-yonetim/kullanicilar", label: "Kullanıcılar", icon: Users },
  { href: "/kayhan-yonetim/ayarlar", label: "Site Ayarları", icon: Settings },
];

interface SidebarProps {
  unreadCount: number;
}

export function Sidebar({ unreadCount }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        const showBadge = href === "/kayhan-yonetim/bildirimler" && unreadCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-lime-primary text-black"
                : "text-muted hover:bg-elevated hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" strokeWidth={2.2} />
              {label}
            </span>
            {showBadge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
