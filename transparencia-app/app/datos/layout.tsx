import type { ReactNode } from "react";
import ModuleUnderConstruction, { CONSTRUCTION_METADATA } from "@/components/ModuleUnderConstruction";
export const metadata = CONSTRUCTION_METADATA;
export default function DataLayout({ children }: {
    children: ReactNode;
}) { return <ModuleUnderConstruction moduleId="datos">{children}</ModuleUnderConstruction>; }
