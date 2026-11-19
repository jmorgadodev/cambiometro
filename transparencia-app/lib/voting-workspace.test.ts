import {describe,expect,it} from "vitest";
import {filterVotingRows,groupVotingProjects,groupVotingSessions,sourceSessionId} from "./voting-workspace";
import type {VotacionAnual} from "./votaciones-destacadas";
const vote=(id:string,date:string,boletin:string|null="18279-10",camara:"Cámara"|"Senado"="Senado"):VotacionAnual=>({votacion_id:id,fecha:date,boletin,camara,titulo:"Educación pública",resumen:"Registro",resultado:"Aprobado",quorum:null,tipo:null,fuente_url:"https://web-back.senado.cl/api/votes?id_sesion=10257",tramite_url:null,votos:{favor:2,contra:1,abstencion:0},destacada:false});
describe("alcance legislativo desde 2026",()=>{
 it("excluye registros anteriores y fechas imposibles; permite años siguientes",()=>{
  expect(filterVotingRows([vote("a","2025-12-31"),vote("b","2026-02-30"),vote("c","2026-11-18"),vote("d","2027-01-01")],{}).map(v=>v.votacion_id)).toEqual(["d","c"]);
 });
 it("combina cámara, año y búsqueda sin tildes",()=>{
  const rows=[vote("a","2026-11-18"),vote("b","2026-11-18",null,"Cámara"),vote("c","2027-01-01")];
  expect(filterVotingRows(rows,{chamber:"Senado",year:"2026",query:"educacion"}).map(v=>v.votacion_id)).toEqual(["a"]);
 });
 it("agrupa un boletín entre cámaras sin llamar ley aprobada a una votación",()=>{
  const groups=groupVotingProjects([vote("a","2026-11-18"),vote("b","2026-11-17","18.279-10","Cámara"),vote("c","2026-11-16",null)]);
  expect(groups).toHaveLength(1);expect(groups[0]).toMatchObject({boletin:"18279-10",votes:2,lastDate:"2026-11-18"});expect(groups[0]).not.toHaveProperty("estadoProyecto");
 });
 it("identifica una sesión sólo desde el parámetro oficial, no desde el ID de voto",()=>{
  expect(sourceSessionId(vote("senado-vot-11274","2026-11-18"))).toBe("10257");
  expect(sourceSessionId({...vote("senado-vot-11274","2026-11-18"),fuente_url:"https://evil.test/?id_sesion=10257"})).toBeNull();
  expect(sourceSessionId({...vote("cam-vot-1","2026-11-18"),camara:"Cámara"})).toBeNull();
 });
 it("distingue sesiones acreditadas de jornadas sin identificador",()=>{
  const groups=groupVotingSessions([vote("a","2026-11-18"),vote("b","2026-11-18"),{...vote("c","2026-11-18",null,"Cámara"),fuente_url:"https://www.camara.cl/"}]);
  expect(groups).toHaveLength(2);expect(groups.find(g=>g.chamber==="Senado")).toMatchObject({sessionId:"10257",votes:2});expect(groups.find(g=>g.chamber==="Cámara")).toMatchObject({sessionId:null,votes:1});
 });
});
