import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { build } from "esbuild";
import { Readable } from "node:stream";
import csv from "csv-parser";
const base = process.env.EXPLORER_QA_BASE ?? "http://127.0.0.1:3201";
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
fs.mkdirSync("artifacts/identity-normative/screenshots", {recursive:true});
await build({entryPoints:["lib/parliamentary-explorer.ts"],outfile:"artifacts/identity-normative/qa-model.cjs",bundle:true,platform:"node",format:"cjs",packages:"external"});
const model = createRequire(import.meta.url)(process.cwd()+"/artifacts/identity-normative/qa-model.cjs");
const data = model.unpackExplorer(JSON.parse(fs.readFileSync("public/data/parliamentary-explorer/bootstrap.json", "utf8")));
const q = {...model.explorerDefaults(data), chamber:"senado", member:"sen-030", memberIds:["sen-030"], from:"2026-03", to:"2026-09", component:"personal", componentIds:["personal"], metricComponent:"personal", compareIds:["sen-030"], comparisonSection:"personal"};
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1366,height:1000}, reducedMotion:"reduce"});
const page = await context.newPage();
const checks=[], errors=[];
let completed=false;
page.on("pageerror", e=>errors.push(e.message));
const check = (name, value) => { checks.push({name, passed:!!value}); assert.ok(value,name); };
try {
  for (const view of ["panorama","explorar","comparar","personal","registros"]) {
    await page.goto(base+"/dashboard/?"+model.explorerParams({...q,view}));
    await page.locator('.site-header[data-hydrated="true"]').waitFor({timeout:60000});
    const no=page.getByRole("button",{name:"Rechazar",exact:true}); if(await no.isVisible()) await no.click();
    const workspace=page.locator("#dashboard-workspace");
    await workspace.waitFor();
    if(view!=="registros") {
      await page.waitForFunction(()=>document.querySelector("#dashboard-workspace")?.textContent.includes("103.462.563"));
      check(view+" shows reconciled amount",(await workspace.innerText()).includes("103.462.563"));
    } else {
      const csvButton=page.getByRole("button", {name:"Exportar CSV (63)",exact:true});
      await csvButton.waitFor({timeout:60000}); await csvButton.waitFor({state:"visible"});
      const pending=page.waitForEvent("download"); await csvButton.click(); const download=await pending;
      const stream=await download.createReadStream(); const chunks=[]; for await(const c of stream) chunks.push(c);
      const text=Buffer.concat(chunks).toString("utf8");
      fs.writeFileSync("artifacts/identity-normative/paulina-browser.csv",text);
      const parsed=[];
      for await(const row of Readable.from([Buffer.from(text.replace(/^\uFEFF/,""))]).pipe(csv({separator:";",mapHeaders:({header})=>header.replace(/^\uFEFF/,"")}))) parsed.push(row);
      check("CSV original office and all 63 records",parsed.length===63 && parsed.every(r=>r["Oficina original de la fuente"]==="VODANOVIC PAULINA" && r.Release===data.releaseId));
      check("downloaded CSV reconciles to raw monthly amounts",parsed.reduce((total,r)=>total+Number(r["Monto CLP"]),0)===103462563);
      const expected=JSON.parse(fs.readFileSync("artifacts/identity-normative/correction-report.json")).recoveredByMonth;
      for(const [period,value] of Object.entries(expected)) {
        const month=parsed.filter(r=>r["Período"]===period);
        assert.equal(month.length,value.records,period);
        assert.equal(month.reduce((total,r)=>total+Number(r["Monto CLP"]),0),value.amount,period);
      }
    }
    await page.screenshot({path:`artifacts/identity-normative/screenshots/paulina-${view}.png`,fullPage:false});
  }
  await page.goto(base+"/politico/paulina-vodanovic-rojas/#seccion-asesores");
  await page.locator('.site-header[data-hydrated="true"]').waitFor();
  await page.waitForFunction(()=>document.body.textContent.includes("14.720.000"));
  check("profile latest staff amount",(await page.locator("body").innerText()).includes("14.720.000"));
  await page.screenshot({path:"artifacts/identity-normative/screenshots/paulina-ficha.png",fullPage:false});
  check("no browser exceptions",errors.length===0);
  completed=true;
} finally {
  fs.writeFileSync("artifacts/identity-normative/identity-browser-receipt.json",JSON.stringify({status:completed?"passed":"failed",base,releaseId:data.releaseId,projectionId:data.projectionId,checks,errors},null,2));
  await browser.close();
}
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length}));
