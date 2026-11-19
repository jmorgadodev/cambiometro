import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PersonalApoyoMensual, { type PersonalApoyoProps } from "@/components/PersonalApoyoMensual";

const amounts = [{nombre:"Menor",monto:1000},{nombre:"Mayor",monto:3000},{nombre:"Intermedio",monto:2000}];
const common = {mesesDisponibles:[{periodo:"2026-09",etiqueta:"Septiembre 2026"}],ultimoPeriodo:"2026-09"};
function checkOrder(props: PersonalApoyoProps) {
 const before=JSON.stringify(props);
 const html=renderToStaticMarkup(createElement(PersonalApoyoMensual,props));
 expect(html.indexOf("Mayor")).toBeLessThan(html.indexOf("Intermedio"));
 expect(html.indexOf("Intermedio")).toBeLessThan(html.indexOf("Menor"));
 expect(html).toContain("$6.000");
 expect(JSON.stringify(props)).toBe(before);
}
describe("personal y asesores por importe de mayor a menor",()=>{
 it("ordena diputados y conserva los importes y el total del mes",()=>{
  checkOrder({...common,cargo:"Diputado",diputadoPersonal:{mes_personal:"septiembre 2026",personal_apoyo:amounts.map(r=>({nombre:r.nombre,sueldo:r.monto,cargo:"Apoyo",tipo:"Contrato"}))}});
 });
 it("ordena senadores sin mezclar otros meses",()=>{
  const props:PersonalApoyoProps={...common,cargo:"Senador",senadorPersonal:{registros:amounts.map(r=>({...r,periodo:"2026-09",apellido_paterno:"",apellido_materno:"",cargo:"Asesor",calidad_juridica:"Contrato"})),ultimo_mes:"2026-09",asignacion:null,evaluaciones:{}}};
  props.senadorPersonal!.registros.push({nombre:"Otro mes",monto:99999,periodo:"2026-08",apellido_paterno:"",apellido_materno:"",cargo:"Asesor",calidad_juridica:"Contrato"});
  checkOrder(props);
  expect(renderToStaticMarkup(createElement(PersonalApoyoMensual,props))).not.toContain("Otro mes");
 });
 it("resuelve empates alfabéticamente y conserva los ceros publicados al final",()=>{
  const props:PersonalApoyoProps={...common,cargo:"Diputado",diputadoPersonal:{mes_personal:"septiembre 2026",personal_apoyo:[{nombre:"Zeta",sueldo:2000,cargo:"Apoyo",tipo:"Contrato"},{nombre:"Cero",sueldo:0,cargo:"Apoyo",tipo:"Contrato"},{nombre:"Ana",sueldo:2000,cargo:"Apoyo",tipo:"Contrato"}]}};
  const html=renderToStaticMarkup(createElement(PersonalApoyoMensual,props));
  expect(html.indexOf("Ana")).toBeLessThan(html.indexOf("Zeta"));
  expect(html.indexOf("Zeta")).toBeLessThan(html.indexOf("Cero"));
 });
});
