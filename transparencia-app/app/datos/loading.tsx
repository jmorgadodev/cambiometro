import { ListadoSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <ListadoSkeleton title="Cargando observatorio de fuentes oficiales..." cardsCount={6} />;
}
