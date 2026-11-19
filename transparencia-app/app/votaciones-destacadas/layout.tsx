import type { ReactNode } from "react";
import Link from "next/link";
import PublicationScopeNotice from "@/components/data/PublicationScopeNotice";

export default function PublicationLayout({ children }: { children: ReactNode }) {
  return <><PublicationScopeNotice area="votaciones" /><p className="container-main" style={{paddingTop:"1rem",fontSize:".82rem"}}><Link prefetch={false} href="/votaciones/">← Explorar los módulos de Votaciones</Link></p>{children}</>;
}
