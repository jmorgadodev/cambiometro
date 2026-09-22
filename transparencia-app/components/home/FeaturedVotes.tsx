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
        {votes.map((vote) => {
          const total = vote.votes ? vote.votes.favor + vote.votes.contra + vote.votes.abstencion : 0;
          return (
            <article key={vote.id}>
              <div className="editorial-votes__story">
                <div className="editorial-votes__meta"><time dateTime={vote.date}>{vote.date}</time><span>{vote.chamber}</span><span>Boletín {vote.bulletin}</span></div>
                <h3>{vote.title}</h3><p>{vote.summary}</p>
                <Link prefetch={false} href={`/votaciones-destacadas/?votacion=${vote.id}`} aria-label={`Abrir análisis de ${vote.bulletin}`}>Ver votación y fuente →</Link>
              </div>
              <div className="editorial-votes__evidence">
                <span className="editorial-votes__result" data-result={vote.result}>{vote.result}</span>
                {vote.votes && total > 0 ? (
                  <>
                    <div className="editorial-votes__bar" role="img" aria-label={`${vote.votes.favor} a favor, ${vote.votes.contra} en contra, ${vote.votes.abstencion} abstenciones`}>
                      <span style={{ width: `${vote.votes.favor / total * 100}%` }} />
                      <span style={{ width: `${vote.votes.contra / total * 100}%` }} />
                      <span style={{ width: `${vote.votes.abstencion / total * 100}%` }} />
                    </div>
                    <div className="editorial-votes__totals"><span><b>{vote.votes.favor}</b> A favor</span><span><b>{vote.votes.contra}</b> En contra</span><span><b>{vote.votes.abstencion}</b> Abst.</span></div>
                  </>
                ) : <small>Desglose nominal no disponible en este corte.</small>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
