import type { ReactNode } from "react";
import PublicationScopeNotice from "@/components/data/PublicationScopeNotice";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <><PublicationScopeNotice area="dashboard" />{children}</>;
}
