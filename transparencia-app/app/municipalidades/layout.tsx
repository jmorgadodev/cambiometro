import type { ReactNode } from "react";
import ModuleUnderConstruction, { CONSTRUCTION_METADATA } from "@/components/ModuleUnderConstruction";

export const metadata = CONSTRUCTION_METADATA;

export default function PublicationLayout({ children }: { children: ReactNode }) {
  void children;
  return <ModuleUnderConstruction moduleId="municipalidades" />;
}
