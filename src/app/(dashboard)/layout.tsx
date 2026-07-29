import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastContainer } from "@/components/ui/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen pb-24 md:pb-0 ipad-content">
        {children}
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
