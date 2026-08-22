import LoadingOrb from "@/components/LoadingOrb";
import { SkeletonFicha } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0" }}>
      <LoadingOrb size={48} label="Cargando ficha parlamentaria..." />
      <SkeletonFicha />
    </div>
  );
}

