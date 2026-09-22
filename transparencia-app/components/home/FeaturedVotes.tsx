import Link from "next/link";
import type { HomeVote } from "./types";

interface FeaturedVotesProps {
  votes: HomeVote[];
  reviewedAt: string;
  latestVoteDate: string;
}

export default function FeaturedVotes({ votes, reviewedAt, latestVoteDate }: FeaturedVotesProps) {
  return (
    <section className="container-main editorial-section editorial-votes" aria-labelledby="votes-title">
      <header className="editorial-heading">
        <div><p className="eyebrow">Seguimiento legislativo</p><h2 id="votes-title">Votaciones destacadas</h2></div>
        <Link prefetch={false} href="/votaciones-destacadas/">Ver todas las votaciones →</Link>
      </header>
      <p className="editorial-section__intro">Una selección de proyectos con impacto público, quórum relevante o materias que conviene entender en contexto.</p>
      <div className="editorial-votes__freshness"><span><b>Última revisión</b>{reviewedAt}</span><span><b>Última votación nominal</b>{latestVoteDate}</span></div>
      <div className="editorial-votes__list">
        {votes.map((vote) => (
          <article key={vote.id}>
            <time dateTime={vote.date}>{vote.date}</time>
            <div><span>{vote.bulletin}</span><h3>{vote.title}</h3><p>{vote.summary}</p><small>{vote.chamber}</small></div>
            <div className="editorial-votes__result" data-result={vote.result}>{vote.result}</div>
            <Link prefetch={false} href={`/votaciones-destacadas/?votacion=${vote.id}`} aria-label={`Abrir análisis de ${vote.bulletin}`}>→</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
