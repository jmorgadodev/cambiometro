/**
 * Return the R2 lake objects represented by a backup inventory.
 * D1 dump keys are intentionally excluded: a restore drill must not treat a
 * D1 dump as proof that the public R2 lake is restorable.
 */
export function getR2LakeObjects(inventory) {
  if (!inventory || !Array.isArray(inventory.objects)) {
    throw new Error("INVENTORY_INVALID: objects array no encontrado");
  }

  const lakeObjects = inventory.objects.filter((key) => (
    typeof key === "string" && key.length > 0 && !key.startsWith("d1/")
  ));

  if (lakeObjects.length === 0) throw new Error("R2_BACKUP_INVENTORY_EMPTY");
  return lakeObjects;
}
