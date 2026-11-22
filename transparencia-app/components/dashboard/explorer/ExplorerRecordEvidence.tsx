"use client";
import { Fragment } from "react";
import NormativeInfo from "@/components/financial/NormativeInfo";
import { explorerMoney, institutionLabel, type ExplorerRecord, type ExplorerMember } from "@/lib/parliamentary-explorer";
import styles from "./Explorer.module.css";
export function RecordSource({ row: r }: {
    row: ExplorerRecord;
}) {
    return r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.sourceScope === "individual" ? "Consultar documento" : "Consultar fuente institucional"} ↗</a> : <small>Sin enlace publicado en la fuente incorporada</small>;
}
export function RecordEvidence({ row: r, member }: {
    row: ExplorerRecord;
    member?: ExplorerMember;
}) {
    return <div className={styles.recordEvidence}>
    <dl>
      {member && <><dt>Parlamentario informante</dt><dd>{member.name}</dd><dt>Institución</dt><dd>{institutionLabel(member.chamber)}</dd></>}
      {r.component === "asesorias" && <><dt>Prestador publicado</dt><dd>{r.providerName ?? "No publicado en la tabla incorporada"}</dd><dt>Servicio contratado</dt><dd>{r.serviceDescription ?? "Sin descripción publicada en la tabla incorporada"}</dd></>}
      {r.personName && <><dt>Nombre publicado</dt><dd>{r.personName}</dd><dt>Cargo</dt><dd>{r.originalRole ?? r.role ?? "No publicado"}</dd></>}
      <dt>{r.originalConcept ? "Concepto original" : "Ítem"}</dt><dd>{r.originalConcept ?? r.item}<NormativeInfo label={r.item} items={[r.item]} component={r.component} from={r.period} to={r.period} chamber={member?.chamber}/></dd>
      {r.originalDescription && <><dt>Descripción original</dt><dd>{r.originalDescription}</dd></>}
      <dt>Período</dt><dd>{r.period}</dd><dt>Monto informado</dt><dd>{explorerMoney(r.amount)}</dd><dt>Fuente</dt><dd>{r.sourceLabel}</dd>
    </dl>
    <RecordSource row={r}/>
    {r.documentUrls?.filter(u => u !== r.sourceUrl).map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer">Documento asociado ↗</a>)}
    <details><summary>Datos del respaldo</summary><dl className={styles.version}>
      <dt>Observación</dt><dd>{r.id}</dd><dt>ID del origen</dt><dd>{r.sourceRecordId ?? "No publicado"}</dd><dt>Alcance</dt><dd>{r.sourceScope}</dd>
      {r.contractType && <><dt>Modalidad</dt><dd>{r.contractType}</dd></>}
      {r.role && <><dt>Cargo normalizado</dt><dd>{r.role}</dd></>}
      {r.sourceOffice && <><dt>Oficina original</dt><dd>{r.sourceOffice}</dd></>}
      {r.retrievedAt && <><dt>Captura individual</dt><dd>{r.retrievedAt}</dd></>}
      {r.sourceSnapshotAt && <><dt>Generación del archivo fuente</dt><dd>{r.sourceSnapshotAt}</dd></>}
      <dt>Release</dt><dd>{r.releaseId}</dd>
      {Object.entries(r.sourceFields ?? {}).map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value || "No publicado"}</dd></Fragment>)}
    </dl></details>
  </div>;
}
