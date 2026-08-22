import LoadingOrb from "@/components/LoadingOrb";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <LoadingOrb size={52} label="Cargando información..." />
      <Skeleton width="40%" height={28} />
      <Skeleton width="60%" height={16} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );
}


