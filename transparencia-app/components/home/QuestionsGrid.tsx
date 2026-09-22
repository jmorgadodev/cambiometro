import Link from "next/link";
import Icono, { type IconoNombre } from "@/components/ui/Icono";

const QUESTIONS: Array<{ href: string; icon: IconoNombre; eyebrow: string; title: string; description: string; action: string }> = [
  { href: "/politico", icon: "votaciones", eyebrow: "Decisiones públicas", title: "¿Cómo votó una autoridad?", description: "Consulta votaciones, asistencia, dieta, gastos operacionales rendidos, asesores, declaraciones, relaciones y fuentes oficiales.", action: "Ver análisis parlamentario" },
  { href: "/transferencias", icon: "dinero", eyebrow: "Dinero y fundaciones", title: "¿A quién transfiere el Estado?", description: "Explora Transferencias Ley 19.862, emisor, receptor y monto.", action: "Explorar transferencias" },
  { href: "/municipalidades", icon: "territorio", eyebrow: "Territorio comunal", title: "¿Cómo se gobiernan 346 comunas?", description: "Compara demografía, finanzas, alcaldías y compras públicas.", action: "Ver municipalidades" },
  { href: "/cruces", icon: "cruces", eyebrow: "Relaciones documentales", title: "¿Qué entidades están conectadas?", description: "Filtra vínculos y abre la evidencia que respalda cada relación.", action: "Abrir explorador" },
  { href: "/personas", icon: "personas", eyebrow: "Directorio de personas", title: "¿Quiénes ocupan los cargos públicos?", description: "Parlamentarios, autoridades y nóminas oficiales en un solo directorio consultable.", action: "Explorar directorio" },
];

export default function QuestionsGrid() {
  return (
    <section className="container-main editorial-section" aria-labelledby="questions-title">
      <header className="editorial-heading">
        <div><p className="eyebrow">Mesa de análisis</p><h2 id="questions-title">Empieza por una pregunta</h2></div>
        <Link prefetch={false} href="/como-funciona">Cómo usamos los datos públicos →</Link>
      </header>
      <div className="editorial-questions">
        {QUESTIONS.map((question, index) => (
          <Link prefetch={false} href={question.href} className={`editorial-question${index === 0 ? " editorial-question--lead" : ""}`} key={question.href}>
            <span className="editorial-question__folio">FICHA {String(index + 1).padStart(2, "0")}</span>
            <span className="editorial-question__icon"><Icono nombre={question.icon} size={20} /></span>
            <span className="eyebrow">{question.eyebrow}</span>
            <h3>{question.title}</h3>
            <p>{question.description}</p>
            {index === 0 && <span className="editorial-question__features">Votaciones y asistencia · Dietas y gastos rendidos · Asesores y declaraciones · Relaciones y fuentes</span>}
            <b>{question.action} <span aria-hidden="true">→</span></b>
          </Link>
        ))}
      </div>
    </section>
  );
}
