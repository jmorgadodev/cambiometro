import LoadingOrb from "@/components/LoadingOrb";
import { SkeletonListado } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0" }}>
      <LoadingOrb size={52} label="Cargando directorio de personas..." />
      <SkeletonListado cards={6} />
    </div>
  );
}

