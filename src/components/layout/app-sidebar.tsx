"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bus,
  CarFront,
  Compass,
  Gauge,
  LayoutDashboard,
  QrCode,
  Shield,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type UserRole } from "@/lib/types";

type SidebarProps = {
  role: UserRole;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student", "faculty", "admin"] },
  { href: "/attendance", label: "Attendance", icon: QrCode, roles: ["student", "faculty", "admin"] },
  { href: "/transport", label: "Transport", icon: Bus, roles: ["student", "faculty", "admin"] },
  { href: "/parking", label: "Parking", icon: CarFront, roles: ["student", "faculty", "admin"] },
  { href: "/alerts", label: "Alerts", icon: Bell, roles: ["student", "faculty", "admin"] },
  { href: "/issues", label: "Issue Reports", icon: TriangleAlert, roles: ["student", "faculty", "admin"] },
  { href: "/navigation", label: "Campus Nav", icon: Compass, roles: ["student", "faculty", "admin"] },
  { href: "/admin", label: "Admin Analytics", icon: Gauge, roles: ["admin"] },
];

export function AppSidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-card/70 hidden w-72 shrink-0 border-r lg:block">
      <div className="flex h-full flex-col p-5">
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <Shield className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">EDVIX</p>
            <p className="text-muted-foreground text-xs">Smart Campus Ecosystem</p>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive && "bg-primary text-primary-foreground hover:text-primary-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
