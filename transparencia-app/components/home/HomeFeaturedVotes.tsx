"use client";

import { useEffect, useState } from "react";
import { publicApiUrl } from "@/lib/public-api-origin";
import { buildLatestSenateVotes, composeHomeLatestSenateVotes } from "@/lib/home-editorial-adapter";
import { FeaturedVotes, type FeaturedVotesProps } from "./FeaturedVotes";

interface SenateVotesResponse {
  data?: unknown[];
  meta?: {
    sourceBackend?: string;
  };
}

export function HomeFeaturedVotes({
  votes,
  reviewedAt,
  latestVoteDate,
}: FeaturedVotesProps) {
  const [latestSenateVotes, setLatestSenateVotes] = useState(votes.slice(0, 3));

  useEffect(() => {
    let active = true;

    const refreshLatestSenateVotes = async () => {
      try {
        const response = await fetch(publicApiUrl("/api/v1/records?source=votaciones_senado&kind=vote&limit=50"), {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json() as SenateVotesResponse;
        if (payload.meta?.sourceBackend !== "r2-lake" || !Array.isArray(payload.data)) return;

        const latest = buildLatestSenateVotes(payload.data as Parameters<typeof buildLatestSenateVotes>[0], 3);
        if (active && latest.length > 0) setLatestSenateVotes(latest);
      } catch {
        // Si R2 no está disponible, la Home conserva las fichas del corte generado.
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshLatestSenateVotes();
    };

    void refreshLatestSenateVotes();
    const timer = window.setInterval(refreshWhenVisible, 10 * 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const displayVotes = composeHomeLatestSenateVotes(latestSenateVotes);

  return (
    <FeaturedVotes
      votes={displayVotes}
      reviewedAt={reviewedAt}
      latestVoteDate={latestSenateVotes[0]?.fecha ?? latestVoteDate}
    />
  );
}

export default HomeFeaturedVotes;
