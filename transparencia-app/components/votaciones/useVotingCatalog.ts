"use client";
import {useEffect,useState} from 'react';
import {publicApiUrl} from '@/lib/public-api-origin';
import type {EvidenceRecord} from '@/lib/data-contracts';
import {explorerRecord,votingRecordUrl,type ExplorerVote,type VoteQuery} from '@/lib/voting-explorer';
type Page={chamber:'Cámara'|'Senado';rows:ExplorerVote[];next:string|null;total:number|null;limited:boolean};
const cache=new Map<string,Page[]>();
const cachedAt=new Map<string,number>();
function remember(key:string,pages:Page[]){if(cache.size>=4&&!cache.has(key)){const oldest=cache.keys().next().value!;cache.delete(oldest);cachedAt.delete(oldest);}cache.set(key,pages);cachedAt.set(key,Date.now());}
async function read(chamber:Page['chamber'],query:VoteQuery,cursor:string|null,signal?:AbortSignal):Promise<Page>{
 const path=votingRecordUrl(chamber,query,cursor);const url=new URL(publicApiUrl(path),window.location.origin);url.searchParams.set('limit','48');
 const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});if(!response.ok)throw Error('Consulta no disponible');
 const body=await response.json();if(!Array.isArray(body.data))throw Error('Catálogo no válido');
 return {chamber,rows:(body.data as EvidenceRecord[]).flatMap(r=>{const v=explorerRecord(r);return v&&v.date>=query.from&&v.date<=query.to?[v]:[];}),next:body.meta?.nextCursor??null,total:typeof body.meta?.total==='number'?body.meta.total:null,limited:!!(body.meta?.missingArtifacts||body.meta?.missingPartitions||body.meta?.sourceStatus==='partial')};
}
export function useVotingCatalog(query:VoteQuery,initial:ExplorerVote[]){
 const key=JSON.stringify(query);const [retry,setRetry]=useState(0);const [state,setState]=useState<{key:string;pages:Page[];loading:boolean;error:boolean}>({key:'',pages:[],loading:true,error:false});
 useEffect(()=>{const controller=new AbortController();const q:VoteQuery=JSON.parse(key);const saved=Date.now()-(cachedAt.get(key)??0)<60000?cache.get(key):undefined;if(saved){Promise.resolve().then(()=>{if(!controller.signal.aborted)setState({key,pages:saved,loading:false,error:false});});return()=>controller.abort();}
 if(q.from>q.to){queueMicrotask(()=>{if(!controller.signal.aborted)setState({key,pages:[],loading:false,error:false});});return()=>controller.abort();}
 const chambers:Page['chamber'][]=q.chamber==='Ambas'?['Cámara','Senado']:[q.chamber];Promise.allSettled(chambers.map(c=>read(c,q,null,controller.signal))).then(results=>{if(controller.signal.aborted)return;const pages=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);const error=results.some(r=>r.status==='rejected');if(!error)remember(key,pages);setState({key,pages,loading:false,error});});return()=>controller.abort();},[key,retry]);
 const current=state.key===key;const live=current&&state.pages.length>0;
 const rows=live?[...new Map(state.pages.flatMap(p=>p.rows).map(r=>[r.chamber+':'+r.id,r])).values()]:initial.filter(r=>r.date>=query.from&&r.date<=query.to&&(query.chamber==='Ambas'||r.chamber===query.chamber));
 async function loadMore(){setState(s=>({...s,loading:true}));const results=await Promise.allSettled(state.pages.map(p=>p.next?read(p.chamber,query,p.next):Promise.resolve(null)));setState(s=>{if(s.key!==key)return s;const pages=s.pages.map(p=>{const found=results.find(r=>r.status==='fulfilled'&&r.value?.chamber===p.chamber);return found?.status==='fulfilled'&&found.value?{...found.value,rows:[...p.rows,...found.value.rows]}:p;});const error=results.some(r=>r.status==='rejected');if(!error)remember(key,pages);return {...s,pages,loading:false,error};});}
 return {rows,live,loading:!current||state.loading,error:current&&state.error,limited:live&&state.pages.some(p=>p.limited),more:live&&state.pages.some(p=>p.next),total:live&&state.pages.every(p=>p.total!==null)?state.pages.reduce((s,p)=>s+p.total!,0):null,loadMore,retry:()=>{cache.delete(key);setRetry(n=>n+1);}};
}
