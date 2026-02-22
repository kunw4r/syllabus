// ─── Awards parsing & aggregation utilities ───

export interface ParsedAwards {
  oscarWins: number;
  oscarNoms: number;
  emmyWins: number;
  emmyNoms: number;
  totalWins: number;
  totalNoms: number;
  raw: string;
}

/** Parse the OMDb `awards` string into structured counts. */
export function parseAwardsString(awards: string | undefined | null): ParsedAwards {
  const result: ParsedAwards = {
    oscarWins: 0, oscarNoms: 0,
    emmyWins: 0, emmyNoms: 0,
    totalWins: 0, totalNoms: 0,
    raw: awards || '',
  };

  if (!awards) return result;

  // Oscar wins/noms
  const oscarWin = awards.match(/Won (\d+) Oscar/);
  if (oscarWin) result.oscarWins = parseInt(oscarWin[1]);
  const oscarNom = awards.match(/Nominated for (\d+) Oscar/);
  if (oscarNom) result.oscarNoms = parseInt(oscarNom[1]);

  // Emmy wins/noms
  const emmyWin = awards.match(/Won (\d+) Primetime Emmy/);
  if (emmyWin) result.emmyWins = parseInt(emmyWin[1]);
  const emmyNom = awards.match(/Nominated for (\d+) Primetime Emmy/);
  if (emmyNom) result.emmyNoms = parseInt(emmyNom[1]);

  // Total wins/noms
  const winsMatch = awards.match(/(\d+) win/);
  if (winsMatch) result.totalWins = parseInt(winsMatch[1]);
  const nomsMatch = awards.match(/(\d+) nomination/);
  if (nomsMatch) result.totalNoms = parseInt(nomsMatch[1]);

  return result;
}

export interface AggregatedAwards {
  totalOscarWins: number;
  totalOscarNoms: number;
  totalEmmyWins: number;
  totalEmmyNoms: number;
  totalWins: number;
  totalNoms: number;
  oscarWinningFilms: { title: string; wins: number }[];
  emmyWinningShows: { title: string; wins: number }[];
}

/** Aggregate awards across an actor's filmography. */
export function aggregateActorAwards(
  films: { title: string; awards?: string }[]
): AggregatedAwards {
  const agg: AggregatedAwards = {
    totalOscarWins: 0, totalOscarNoms: 0,
    totalEmmyWins: 0, totalEmmyNoms: 0,
    totalWins: 0, totalNoms: 0,
    oscarWinningFilms: [],
    emmyWinningShows: [],
  };

  for (const film of films) {
    const parsed = parseAwardsString(film.awards);
    agg.totalOscarWins += parsed.oscarWins;
    agg.totalOscarNoms += parsed.oscarNoms;
    agg.totalEmmyWins += parsed.emmyWins;
    agg.totalEmmyNoms += parsed.emmyNoms;
    agg.totalWins += parsed.totalWins;
    agg.totalNoms += parsed.totalNoms;

    if (parsed.oscarWins > 0) {
      agg.oscarWinningFilms.push({ title: film.title, wins: parsed.oscarWins });
    }
    if (parsed.emmyWins > 0) {
      agg.emmyWinningShows.push({ title: film.title, wins: parsed.emmyWins });
    }
  }

  return agg;
}
