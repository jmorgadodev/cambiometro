import SourceLink from "@/components/data/SourceLink";
import { formatCLP } from "@/lib/format";
import { formatPublishedMonth } from "@/lib/month-periods";
import styles from "./AuthorityProfile.module.css";

interface PublishedAmount { amount:number|null; period:string|null }
export function AuthorityProfileSummary({salary,expenses,staff,salarySource,expensesSource,staffSource}:{salary:PublishedAmount;expenses:PublishedAmount;staff:PublishedAmount;salarySource:string;expensesSource:string;staffSource:string}) {
  const items=[
    {label:"Dieta bruta oficial",metric:salary,href:"#dieta-parlamentaria",source:salarySource},
    {label:"Gastos operacionales",metric:expenses,href:"#seccion-gastos",source:expensesSource},
    {label:"Personal de apoyo",metric:staff,href:"#seccion-asesores",source:staffSource},
  ];
  return <div id="resumen-ficha">
    <p className={styles.lead}>Los últimos importes incorporados, cada uno con su mes y fuente. Selecciona un apartado para revisar el detalle.</p>
    <dl className={styles.summaryGrid}>{items.map(item=><div className={styles.summaryCard} key={item.href}>
      <dt>{item.label}</dt><dd><strong>{item.metric.amount===null?"No informado":formatCLP(item.metric.amount)}</strong><span>{item.metric.period?formatPublishedMonth(item.metric.period):"Período no informado"}</span>
      <SourceLink className={styles.detailLink} href={item.href}>Consultar detalle →</SourceLink>
      <SourceLink className={styles.sourceLink} href={item.source} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</SourceLink></dd>
    </div>)}</dl>
    <div className={styles.note}><strong>Cada componente conserva su período</strong><p>Las fechas pueden diferir. Estos importes no se suman como un costo mensual común. Un dato ausente no equivale a cero; la dieta conserva su última referencia oficial con su mes de origen.</p></div>
    <div className={styles.shortcuts}><a href="#seccion-votaciones">Consultar votaciones →</a><a href="#seccion-trayectoria">Timeline, militancias y declaración →</a><a href="#fuentes-ficha">Cómo leer esta ficha →</a></div>
  </div>;
}
export function AuthorityProfileSources({chamber}:{chamber:"Diputado"|"Senador"}) {
  return <div id="fuentes-ficha" className={styles.sources}>
    <p>Esta ficha reúne registros de {chamber==="Diputado"?"la Cámara de Diputadas y Diputados":"el Senado"}, la Comisión de Remuneraciones, SERVEL y antecedentes públicos identificados en cada apartado.</p>
    <ul><li>Los gastos rendidos, la dieta y el personal tienen períodos y unidades propios.</li><li>La emisión de un voto no acredita asistencia formal a una sesión.</li><li>Los antecedentes históricos conservan su fecha; no acreditan un cargo vigente.</li><li>Lobby y declaraciones conservan los datos publicados; sus fuentes secundarias están pausadas durante la estabilización.</li></ul>
    <p><a href="/fuentes/">Fuentes y alcances →</a> · <a href="/como-funciona/#alcance-publicacion">Metodología y cobertura →</a> · <a href="/datos/calidad/">Calidad de los datos →</a></p>
  </div>;
}
