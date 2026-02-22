import { NextRequest, NextResponse } from 'next/server';

export interface ParsedIntent {
  type: 'title_search' | 'mood' | 'scenario' | 'similar_to' | 'natural_language';
  genres?: string[];
  mediaType?: 'movie' | 'tv' | 'book' | null;
  yearRange?: { min?: number; max?: number };
  mood?: string;
  similarTo?: string;
  keywords?: string[];
  originalQuery: string;
}

const DESCRIPTIVE_WORDS = [
  'feel', 'mood', 'like', 'similar', 'vibe', 'genre', 'type',
  'good', 'best', 'top', 'great', 'amazing', 'classic', 'new',
  'funny', 'scary', 'sad', 'happy', 'dark', 'light', 'epic',
  'romantic', 'thrilling', 'inspiring', 'emotional', 'mind',
  'something', 'anything', 'recommend', 'suggestion', 'watch',
  'movies', 'shows', 'films', 'series', 'anime', 'documentary',
];

function isDescriptiveQuery(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/);
  if (words.length <= 2 && !DESCRIPTIVE_WORDS.some((d) => query.toLowerCase().includes(d))) {
    return false;
  }
  return DESCRIPTIVE_WORDS.some((d) => query.toLowerCase().includes(d));
}

async function parseWithClaude(query: string): Promise<ParsedIntent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Parse this search query for a media discovery app. Return ONLY valid JSON, no other text.

Query: "${query}"

Return this exact JSON structure:
{
  "type": "mood" | "scenario" | "similar_to" | "natural_language",
  "genres": ["genre1", "genre2"],
  "mediaType": "movie" | "tv" | "book" | null,
  "yearRange": { "min": 1990, "max": 2000 } or null,
  "mood": "happy" | "sad" | "thrilling" | "relaxing" | "dark" | "inspiring" | null,
  "similarTo": "title of reference media" or null,
  "keywords": ["keyword1", "keyword2"]
}

Rules:
- "type" = "mood" for emotional queries like "feel good movies"
- "type" = "scenario" for situation queries like "date night"
- "type" = "similar_to" for "like Inception" or "similar to Breaking Bad"
- "type" = "natural_language" for complex multi-faceted queries
- genres should use standard names: Action, Comedy, Drama, Horror, Romance, Thriller, Sci-Fi, Animation, Documentary, Crime, Fantasy, Mystery, Adventure, Family, War, Western, Music
- Keep keywords short and relevant`,
        }],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      ...parsed,
      originalQuery: query,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const trimmed = query.trim();

    // Fast path: short non-descriptive queries → title search
    if (!isDescriptiveQuery(trimmed)) {
      const intent: ParsedIntent = {
        type: 'title_search',
        originalQuery: trimmed,
        keywords: [trimmed],
      };
      return NextResponse.json(intent);
    }

    // Try Claude Haiku parsing
    const claudeIntent = await parseWithClaude(trimmed);
    if (claudeIntent) {
      return NextResponse.json(claudeIntent);
    }

    // Fallback: natural language type
    return NextResponse.json({
      type: 'natural_language',
      originalQuery: trimmed,
      keywords: trimmed.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2),
    } as ParsedIntent);
  } catch {
    return NextResponse.json({ type: 'natural_language', originalQuery: '' } as ParsedIntent);
  }
}
