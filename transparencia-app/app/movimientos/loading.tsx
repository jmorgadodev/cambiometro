import { ListadoSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <ListadoSkeleton title="Cargando catálogo de movimientos..." cardsCount={6} />;
}
