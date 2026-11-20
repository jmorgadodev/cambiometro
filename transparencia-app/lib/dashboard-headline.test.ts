import {describe,it,expect} from "vitest";
import {dashboardDefaults,dashboardHeadlineMetrics,filterDashboardRows,dashboardCsv,dashboardTimeline,type DashboardData} from "./parliamentary-dashboard";
const data:DashboardData={mode:"local-verified",releaseId:"r",notes:[],members:[{id:"a",name:"Ana Perez Soto",chamber:"camara",partyId:"p"},{id:"b",name:"Luis Rojas Diaz",chamber:"senado",partyId:"q"}],rows:[{memberId:"a",period:"2026-06",component:"dieta",category:"Dieta",item:"Referencia",amount:800},{memberId:"a",period:"2026-07",component:"dieta",category:"Dieta",item:"Referencia",amount:900},{memberId:"b",period:"2026-06",component:"dieta",category:"Dieta",item:"Referencia",amount:1000},{memberId:"a",period:"2026-09",component:"gastos",category:"Oficina",item:"Arriendo",amount:50},{memberId:"a",period:"2026-09",component:"personal",category:"Apoyo",item:"Nomina",amount:100},{memberId:"a",period:"2026-09",component:"asesorias",category:"Asesoria",item:"Contrato",amount:20}]};
describe("tarjetas de referencia",()=>{
 it("la suma respeta ajustes negativos sin convertirlos a valores absolutos",()=>{const d={...data,rows:data.rows.map(row=>row.component==="gastos"?{...row,amount:-50}:row)};expect(dashboardHeadlineMetrics(d,dashboardDefaults(d)).total).toBe(13370);});
 it("usa una última dieta por persona aunque no esté en el rango posterior",()=>{const result=dashboardHeadlineMetrics(data,{...dashboardDefaults(data),from:"2026-09",to:"2026-09"});expect(result.summary.dieta.amount).toBe(1900);expect(result.referenceCount).toBe(2);expect(result.referencePeriods).toEqual(["2026-06","2026-07"]);expect(result.total).toBe(2070);});
 it("cohorte sí restringe referencias y filtros de visualización no borran tarjetas",()=>{const result=dashboardHeadlineMetrics(data,{...dashboardDefaults(data),memberIds:["a"],component:"gastos",componentIds:["gastos"],category:"Oficina",item:"Arriendo"});expect(result.summary.dieta.amount).toBe(6300);expect(result.summary.personal.amount).toBe(100);expect(result.total).toBe(6470);});
 it("no duplica referencias repetidas ni sustituye por una dieta ausente/cero",()=>{const d={...data,rows:[...data.rows,data.rows[1],{...data.rows[1],period:"2026-09",amount:0}]};expect(dashboardHeadlineMetrics(d,dashboardDefaults(d)).summary.dieta.amount).toBe(13300);});
 it("retiene referencias ambiguas del mismo mes y conserva ausencia sin pago inventado",()=>{const d={...data,rows:[...data.rows,{...data.rows[1],amount:999}]};expect(dashboardHeadlineMetrics(d,dashboardDefaults(d)).referenceCount).toBe(1);const empty={...data,rows:[]};expect(dashboardHeadlineMetrics(empty,dashboardDefaults(empty)).total).toBeNull();});
 it("aplica la referencia a cada mes sin modificar registros oficiales",()=>{
  const before=JSON.stringify(data);const f=dashboardDefaults(data);const rows=filterDashboardRows(data,f);
  const diet=rows.filter(row=>row.component==="dieta");expect(diet).toHaveLength(14);
  expect(diet.every(row=>row.estimated && row.referencePeriod)).toBe(true);
  expect(diet.filter(row=>row.memberId==="a").every(row=>row.amount===900&&row.referencePeriod==="2026-07")).toBe(true);
  expect(dashboardTimeline(rows,f.from,f.to).map(row=>row.values.dieta.amount)).toEqual(Array(7).fill(1900));
  expect(dashboardHeadlineMetrics(data,f)).toMatchObject({referenceMonthlyAmount:1900,appliedMonths:7});
  expect(JSON.stringify(data)).toBe(before);
  const csv=dashboardCsv(data,diet);expect(csv).toContain("Estimación por dieta fija");expect(csv).toContain("Mes de referencia");expect(csv).toContain('"2026-07"');
 });
 it("no inventa dieta para una persona sin referencia positiva",()=>{
  const d={...data,rows:data.rows.filter(row=>row.memberId!=="a"||row.component!=="dieta")};
  const rows=filterDashboardRows(d,{...dashboardDefaults(d),memberIds:["a"]});expect(rows.filter(row=>row.component==="dieta")).toEqual([]);
 });
});
