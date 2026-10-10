import type { ReactNode } from "react";
import PublicationScopeNotice from "@/components/data/PublicationScopeNotice";

export default function PublicationLayout({ children }: { children: ReactNode }) {
  return <><PublicationScopeNotice area="datos" />{children}</>;
}
