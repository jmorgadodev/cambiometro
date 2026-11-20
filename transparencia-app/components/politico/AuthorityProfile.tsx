"use client";

import { Children, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
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
  const layoutRef=useRef<HTMLDivElement>(null);
  const navigationRef=useRef<HTMLElement>(null);
  const hash=useSyncExternalStore(subscribe,getHash,serverHash);
  const ready=useSyncExternalStore(subscribe,clientReady,serverReady);
  const active=resolveAuthoritySection(hash,sections);
  const activeIndex=sections.findIndex(section=>section.id===active.id);
  const previous=sections[activeIndex-1];
  const next=sections[activeIndex+1];
  const navigate=(section:AuthoritySection|undefined)=>{if(section)window.location.hash=section.href;};
  useEffect(()=>{
    if(!ready) return;
    const layout=layoutRef.current;
    const navigation=navigationRef.current;
    const header=document.querySelector<HTMLElement>(".site-header");
    if(!layout || !navigation) return;
    const measure=()=>{
      layout.style.setProperty("--authority-header-height",`${header?.getBoundingClientRect().height??0}px`);
      layout.style.setProperty("--authority-navigation-height",`${navigation.getBoundingClientRect().height}px`);
    };
    measure();
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
    if(header)observer?.observe(header);
    observer?.observe(navigation);
    window.addEventListener("resize",measure);
    return ()=>{observer?.disconnect();window.removeEventListener("resize",measure);};
  },[ready]);
  useEffect(()=>{
    if(!ready || !hash) return;
    let id="";try{id=decodeURIComponent(hash.slice(1));}catch{return;}
    const target=document.getElementById(id);
    if(!target) return;
    document.getElementById(`authority-heading-${active.id}`)?.focus({preventScroll:true});
    // Canonical mobile navigation starts at the panel heading; legacy deep links
    // still reach their exact inner anchor.
    const panelStart=window.matchMedia("(max-width:850px)").matches && id===active.href.slice(1);
    const destination=panelStart?document.getElementById(`authority-panel-${active.id}`)??target:target;
    destination.scrollIntoView({block:"start"});
  },[hash,active.id,active.href,ready]);
  return <div ref={layoutRef} className={`container-main ${styles.layout}`} data-enhanced={ready}>
    <aside className={styles.sidebar}><AuthoritySectionNav items={sections} activeId={active.id} /></aside>
    <div className={styles.panels}>
      <nav ref={navigationRef} className={styles.mobileNavigation} aria-label="Cambiar apartado de la ficha">
        <button type="button" className={styles.sectionStep} disabled={!ready || !previous} aria-label={previous?`Apartado anterior: ${previous.label}`:"Primer apartado"} onClick={()=>navigate(previous)}>
          <span aria-hidden="true">←</span>
        </button>
        <label className={styles.mobileSelector}>
          <span>Apartado de la ficha <span className={styles.sectionPosition} aria-hidden="true">{activeIndex+1}/{sections.length}</span></span>
          <select aria-label="Apartado de la ficha" value={active.id} disabled={!ready} onChange={e=>navigate(sections.find(section=>section.id===e.target.value))}>
            {sections.map(section=><option key={section.id} value={section.id}>{section.label}</option>)}
          </select>
        </label>
        <button type="button" className={styles.sectionStep} disabled={!ready || !next} aria-label={next?`Apartado siguiente: ${next.label}`:"Último apartado"} onClick={()=>navigate(next)}>
          <span aria-hidden="true">→</span>
        </button>
      </nav>
      {sections.map(section=><section key={section.id} id={`authority-panel-${section.id}`} className={styles.panel} data-profile-panel={section.id} data-default={section.id==="resumen"} hidden={ready && section.id!==active.id} aria-labelledby={`authority-heading-${section.id}`}>
        <header className={styles.panelHeading}><p className={styles.eyebrow}>Expediente parlamentario</p><h2 id={`authority-heading-${section.id}`} tabIndex={-1}>{section.label}</h2><p>{section.description}</p></header>
        {Children.toArray(content[section.id])}
      </section>)}
      <noscript><p>Los enlaces del expediente permiten consultar cada apartado. Las cifras conservan el período y la fuente de cada registro.</p></noscript>
    </div>
  </div>;
}
