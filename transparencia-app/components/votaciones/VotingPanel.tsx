"use client";
import {useEffect,useRef,type ReactNode} from 'react';
import styles from './VotingExperience.module.css';
/** Shared native modal: focus, Escape, scroll lock and backdrop closing. */
export default function VotingPanel({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!open||!el)return;const trigger=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;if(trigger?.isConnected)trigger.focus({preventScroll:true});};},[open]);
 useEffect(()=>{if(open)ref.current?.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});},[open,title]);
 return <dialog ref={ref} className={styles.panel} aria-label={title} onClose={onClose} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}}><header className={styles.panelHeader}><span>{title}</span><button type="button" onClick={()=>ref.current?.close()} autoFocus aria-label={'Cerrar '+title}>Cerrar ×</button></header><div className={styles.panelBody}>{children}</div></dialog>;
}
