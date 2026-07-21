import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { RequireRole } from "@/components/common/RequireRole";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["buyer"]}>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </RequireRole>
  );
}

