import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Skeleton width="40%" height={24} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );
}

