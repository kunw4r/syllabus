import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI generation not configured' }, { status: 503 });
  }

  const { prompt } = await request.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const fullPrompt = `Profile avatar portrait, ${prompt.trim()}, centered face, clean background, high quality, digital art style`;

  // Generate image with OpenAI DALL-E 2 (256x256 = ~$0.02/image)
  let imageBlob: Blob | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-2',
        prompt: fullPrompt,
        n: 1,
        size: '256x256',
        response_format: 'b64_json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error:', res.status, err);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const json = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: 'No image returned' }, { status: 502 });
    }

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    imageBlob = new Blob([bytes], { type: 'image/png' });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return NextResponse.json({ error: 'AI generation timed out' }, { status: 504 });
    }
    console.error('OpenAI error:', e);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }

  // Upload to Supabase Storage
  const path = `${user.id}/avatar-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, imageBlob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
