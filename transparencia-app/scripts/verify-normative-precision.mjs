/** Precision and neutral interpretation, local browser only. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.EXPLORER_QA_BASE??'http://127.0.0.1:3200';assert.match(base,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const dir='artifacts/normative-precision';fs.mkdirSync(dir+'/screenshots',{recursive:true});
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1366,height:1050},reducedMotion:'reduce'});const page=await context.newPage();
const checks=[],errors=[],consoleErrors=[],requests=[];let status='failed';page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('request',r=>requests.push(new URL(r.url()).pathname));
const check=(name,value)=>{checks.push({name,passed:!!value});assert.ok(value,name);};
async function ready(){await page.locator('.site-header[data-hydrated="true"]').waitFor({timeout:60000});const reject=page.getByRole('button',{name:'Rechazar',exact:true});if(await reject.isVisible())await reject.click();}
const panel=()=>page.getByRole('dialog',{name:'Alcance normativo',exact:true});
try{
 await page.goto(base+'/politico/manuel-jose-ossandon-irarrazabal/#seccion-asesores');await ready();
 await page.getByRole('combobox',{name:'Filtrar personal de apoyo y asesores: mes publicado',exact:true}).selectOption('2026-04');
 const staff=page.getByRole('group',{name:'Filtrar personal de apoyo y asesores',exact:true}).locator('..');
 const text=await staff.innerText();
 check('four unchanged original records and roles',await staff.getByText('INDEFINIDO',{exact:true}).count()===4&&['KING SUAU MARIA PAZ','PEREZ CERDA NATALIA MAGALY','MATURANA LABARCA OMAR MAURICIO','COLLAO RAMOS SUSANA ANYELINA','APOYO ADMINISTRATIVO','ASESOR (A) LEGISLATIVO'].every(s=>text.includes(s)));
 const amounts=(await staff.locator('strong').allTextContents()).filter(s=>s.trim().startsWith('$')).map(s=>Number(s.replace(/\D/g,'')));
 check('original amounts and total preserved',JSON.stringify(amounts)===JSON.stringify([6045364,3574412,1931307,1806479])&&amounts.reduce((a,b)=>a+b,0)===13357562&&text.includes('13.357.562'));
 check('no inference of expert category or breach',!/Hallazgo de integridad|Exceso de|diferencia sin respaldo|JEFA DE GABINETE|25 %/.test(text));
 await staff.scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/screenshots/ossandon-abril-sin-alerta.png'});
 await page.getByRole('button',{name:'Información normativa: Personal de apoyo',exact:true}).click();await panel().getByRole('button',{name:'Condiciones',exact:true}).click();
 const p=await panel().innerText();check('expert condition explicitly aggregated with authorized transfers',p.includes('Solo para expertos')&&p.includes('conjunto de contrataciones')&&p.includes('reasignaciones autorizadas')&&p.includes('no es un tope salarial individual'));
 check('other categories are not automatically experts',p.includes('administrativo, profesional ni técnico')&&p.includes('cargo publicado')&&p.includes('clasificación contractual'));
 check('no named case in normative explanation',!/KING|OSSAND[ÓO]N|6045364|6\.045\.364/.test(p));
 const axe=await new AxeBuilder({page}).include('dialog[open]').analyze();check('precision panel accessible',!axe.violations.some(v=>['critical','serious'].includes(v.impact)));
 await page.screenshot({path:dir+'/screenshots/personal-expertos.png'});
 await panel().getByText('En contratación conjunta',{exact:true}).click();check('joint contracting has its own scope',(await panel().innerText()).includes('reglamento de cada Corporación'));
 await page.setViewportSize({width:390,height:844});await panel().getByText('En contratación conjunta',{exact:true}).click();check('mobile precision panel fits',await panel().evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:dir+'/screenshots/personal-expertos-movil.png'});await page.keyboard.press('Escape');
 await page.setViewportSize({width:1366,height:1050});
 await page.goto(base+'/dashboard/?desde=2026-04&hasta=2026-04&vista=panorama');await ready();await page.getByRole('button',{name:/^Información normativa/}).first().click();
 await panel().getByRole('combobox',{name:'Concepto normativo',exact:true}).selectOption('vehiculos');await panel().getByRole('button',{name:'Condiciones',exact:true}).click();await panel().getByText('Solo para mantenimiento de vehículos propios',{exact:true}).click();
 check('vehicle limit is per owned vehicle and calendar year',(await panel().innerText()).includes('$2.000.000 por vehículo y año calendario')&&(await panel().innerText()).includes('excepciones a ese límite'));
 await page.screenshot({path:dir+'/screenshots/vehiculos-precision.png'});await page.keyboard.press('Escape');
 await page.goto(base+'/como-funciona/?norma=crap-res-11#normativa-y-fuentes');await ready();const doc=page.locator('#catalogo-normativo');await page.waitForFunction(()=>document.querySelector('[aria-label="Versión normativa"]')?.value==='crap-res-11');
 await doc.locator('#norma-vehiculos > summary').click();check('historical vehicle rule remains distinct',!(await doc.locator('#norma-vehiculos').innerText()).includes('$2.000.000'));
 await doc.locator('#norma-desplazamientos > summary').click();check('no retroactive taxi cap',!(await doc.locator('#norma-desplazamientos').innerText()).includes('60 %'));
 await doc.getByRole('combobox',{name:'Versión normativa',exact:true}).selectOption('crap-res-12');await doc.locator('#norma-desplazamientos > summary').click();check('taxi limit applies only to its modality',(await doc.locator('#norma-desplazamientos').innerText()).includes('60 % del tope mensual de arriendo'));
 await doc.locator('#norma-personal > summary').click();check('condition citations available in documentation',(await doc.locator('#norma-personal').innerText()).includes('VI.A.1.a–c')&&(await doc.locator('#norma-personal').innerText()).includes('página PDF 16'));
 check('no exceptions',!errors.length);check('no dynamic API/D1',!requests.some(p=>/^\/api\/|\/d1\//.test(p)));status='passed';
}finally{fs.writeFileSync(dir+'/browser-receipt.json',JSON.stringify({status,base,checks,errors,consoleErrors,apiRequests:requests.filter(p=>p.startsWith('/api/'))},null,2));await browser.close();}
console.log(JSON.stringify({status,checks:checks.length}));
