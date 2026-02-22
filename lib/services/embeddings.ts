const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2';

export function buildContentText(item: {
  title: string;
  overview?: string | null;
  genres?: string[];
  keywords?: string[];
  director?: string | null;
  cast_names?: string[];
}): string {
  const parts = [item.title];
  if (item.overview) parts.push(item.overview);
  if (item.genres?.length) parts.push(`Genres: ${item.genres.join(', ')}`);
  if (item.keywords?.length) parts.push(`Keywords: ${item.keywords.join(', ')}`);
  if (item.director) parts.push(`Director: ${item.director}`);
  if (item.cast_names?.length) parts.push(`Cast: ${item.cast_names.slice(0, 5).join(', ')}`);
  return parts.join('. ');
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // HF returns a single array for single input
    if (Array.isArray(data) && typeof data[0] === 'number') return data;
    return null;
  } catch {
    return null;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return texts.map(() => null);

  try {
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    });

    if (!res.ok) return texts.map(() => null);

    const data = await res.json();
    // HF returns array of arrays for batch input
    if (Array.isArray(data) && Array.isArray(data[0])) return data;
    return texts.map(() => null);
  } catch {
    return texts.map(() => null);
  }
}
