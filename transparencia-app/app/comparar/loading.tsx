import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h1 style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>Cargando</h1>
      <Skeleton width="30%" height={24} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );
}
