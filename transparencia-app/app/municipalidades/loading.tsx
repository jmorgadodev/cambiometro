import { ListadoSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <ListadoSkeleton title="Cargando directorio de municipalidades..." cardsCount={8} />;
}
