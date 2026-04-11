"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type TopHeaderProps = {
  name: string;
  email: string;
  role: UserRole;
};

const NAV_ITEMS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["student", "faculty", "admin"] },
  { href: "/attendance", label: "Attendance", roles: ["student", "faculty", "admin"] },
  { href: "/transport", label: "Transport", roles: ["student", "faculty", "admin"] },
  { href: "/driver", label: "Driver Panel", roles: ["bus_driver"] },
  { href: "/parking", label: "Parking", roles: ["student", "faculty", "admin"] },
  { href: "/alerts", label: "Alerts", roles: ["student", "faculty", "admin"] },
  { href: "/issues", label: "Issue Reports", roles: ["student", "faculty", "admin"] },
  { href: "/navigation", label: "Campus Nav", roles: ["student", "faculty", "admin"] },
  { href: "/admin", label: "Admin Analytics", roles: ["admin"] },
];

export function TopHeader({ name, email, role }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const signOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed out");
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="bg-card/70 sticky top-0 z-20 border-b backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <details className="relative lg:hidden">
          <summary className="list-none">
            <Button variant="outline" size="icon" asChild>
              <span>
                <Menu className="size-4" />
              </span>
            </Button>
          </summary>
          <div className="bg-popover absolute mt-2 w-52 rounded-lg border p-2 shadow-lg">
            {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm ${pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-muted-foreground text-xs">{email}</p>
          </div>

          <Avatar>{getInitials(name)}</Avatar>

          <Button variant="outline" size="icon" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
