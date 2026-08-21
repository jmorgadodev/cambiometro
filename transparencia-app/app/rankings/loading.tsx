import { SkeletonTable } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0" }}>
      <h1 style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>Cargando</h1>
      <SkeletonTable rows={10} cols={3} />
    </div>
  );
}
