"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { resolveAuthoritySection, type AuthoritySection } from "@/lib/authority-profile";
import AuthoritySectionNav from "./AuthoritySectionNav";
import styles from "./AuthorityProfile.module.css";

function subscribe(listener:()=>void) {
  window.addEventListener("hashchange",listener); window.addEventListener("popstate",listener);
  return ()=>{window.removeEventListener("hashchange",listener);window.removeEventListener("popstate",listener);};
}
const getHash=()=>window.location.hash;
const serverHash=()=>"";
const clientReady=()=>true;
const serverReady=()=>false;

export default function AuthorityProfile({sections,content}:{sections:readonly AuthoritySection[];content:Record<string,ReactNode>}) {
  const hash=useSyncExternalStore(subscribe,getHash,serverHash);
  const ready=useSyncExternalStore(subscribe,clientReady,serverReady);
  const active=resolveAuthoritySection(hash,sections);
  useEffect(()=>{
    if(!ready || !hash) return;
    let id="";try{id=decodeURIComponent(hash.slice(1));}catch{return;}
    const target=document.getElementById(id);
    if(!target) return;
    document.getElementById(`authority-heading-${active.id}`)?.focus({preventScroll:true});
    target.scrollIntoView({block:"start"});
  },[hash,active.id,ready]);
  return <div className={`container-main ${styles.layout}`} data-enhanced={ready}>
    <aside className={styles.sidebar}><AuthoritySectionNav items={sections} activeId={active.id} /></aside>
    <div className={styles.panels}>
      <label className={styles.mobileSelector}>Apartado de la ficha
        <select aria-label="Apartado de la ficha" value={active.id} disabled={!ready} onChange={e=>{const next=sections.find(s=>s.id===e.target.value);if(next)window.location.hash=next.href;}}>
          {sections.map(section=><option key={section.id} value={section.id}>{section.label}</option>)}
        </select>
      </label>
      {sections.map(section=><section key={section.id} id={`authority-panel-${section.id}`} className={styles.panel} data-profile-panel={section.id} data-default={section.id==="resumen"} hidden={ready && section.id!==active.id} aria-labelledby={`authority-heading-${section.id}`}>
        <header className={styles.panelHeading}><p className={styles.eyebrow}>Expediente parlamentario</p><h2 id={`authority-heading-${section.id}`} tabIndex={-1}>{section.label}</h2><p>{section.description}</p></header>
        {content[section.id]}
      </section>)}
      <noscript><p>Los enlaces del expediente permiten consultar cada apartado. Las cifras conservan el período y la fuente de cada registro.</p></noscript>
    </div>
  </div>;
}
