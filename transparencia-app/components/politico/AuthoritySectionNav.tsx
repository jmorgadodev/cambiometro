import SourceLink from "@/components/data/SourceLink";
import { authoritySections, type AuthoritySection } from "@/lib/authority-profile";
import styles from "./AuthorityProfile.module.css";

export default function AuthoritySectionNav({ hasElectionData=false, hasExternalAdvisories=false, items, activeId="resumen" }: {
  hasElectionData?:boolean; hasExternalAdvisories?:boolean; items?:readonly AuthoritySection[]; activeId?:string;
}) {
  const sections=items ?? authoritySections({hasElectionData,hasExternalAdvisories});
  return <nav className={styles.navigation} aria-label="Secciones de la ficha de autoridad">
    <p className={styles.navTitle}>En esta ficha</p>
    {sections.map(section=><SourceLink className={styles.navLink} key={section.id} href={section.href} aria-current={section.id===activeId?"location":undefined}>
      <strong>{section.label}</strong><span>{section.description}</span>
    </SourceLink>)}
  </nav>;
}
