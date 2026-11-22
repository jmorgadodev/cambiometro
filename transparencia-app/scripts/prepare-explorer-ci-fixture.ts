/** Isolated PR fixture: never used by Pages publication workflows. No network or ETL. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assembleDashboard} from '../lib/parliamentary-dashboard-data';
const hash=(value: string|Buffer)=>createHash('sha256').update(value).digest('hex');
async function main(){
 if(process.env.CI!=='true'||process.env.ALLOW_STATIC_SAMPLE!=='1'||process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY==='1')throw new Error('EXPLORER_FIXTURE_REQUIRES_ISOLATED_CI');
 const root=path.resolve('.ci-data-version/explorer-fixture');fs.mkdirSync(root,{recursive:true});
 const files=['data/lake-subsets/gastos-camara.subset.json','data/lake-subsets/gastos-senado.subset.json','data/personal-apoyo.json'];
 const inputs=files.map(file=>{const raw=file==='data/personal-apoyo.json'?fs.readFileSync(file):Buffer.from(JSON.stringify({fixture:'isolated-ci',records:[]}));const inputPath=path.join(root,path.basename(file));fs.writeFileSync(inputPath,raw);return{publishedPath:file,inputPath,size:raw.length,checksumSha256:hash(raw)};});
 const read=(index:number)=>JSON.parse(fs.readFileSync(inputs[index].inputPath,'utf8'));
 const releaseId='ci-fixture-'+hash(JSON.stringify(inputs.map(f=>f.checksumSha256)));
 const data=await assembleDashboard({camara:read(0).records,senado:read(1).records,staff:read(2),salaryLookup:async()=>null,releaseId,mode:'local-verified'});
 fs.writeFileSync(path.join(root,'dashboard.json'),JSON.stringify({data,sha256:hash(JSON.stringify(data))}));
 const salary=Buffer.from('[]\n');const salaryPath=path.join(root,'salary.json');fs.writeFileSync(salaryPath,salary);
 fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify({releaseId,inputs,salaryPath,salary:{releaseId,projectedSha256:hash(salary),manifestSha256:hash(salary)},purpose:'isolated-ci-fixture-not-published'}));
 console.log(JSON.stringify({mode:'isolated-ci-fixture',releaseId,members:data.members.length,rows:data.rows.length}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
