import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <div className="bg-muted/20 flex min-h-screen">
      <AppSidebar role={profile.role} />

      <div className="flex min-h-screen flex-1 flex-col">
        <TopHeader name={profile.name} email={profile.email} role={profile.role} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
