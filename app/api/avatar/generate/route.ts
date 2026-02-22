import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const TIMEOUTS = [20000, 30000, 40000]; // Retry with increasing timeouts

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const fullPrompt = encodeURIComponent(
    `profile avatar portrait, ${prompt.trim()}, centered face, clean background, high quality, digital art`
  );
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${fullPrompt}?width=256&height=256&nologo=true`;

  // Try fetching from Pollinations with retries
  let imageBlob: Blob | null = null;

  for (let attempt = 0; attempt < TIMEOUTS.length; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS[attempt]);

      const res = await fetch(pollinationsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) continue;

      imageBlob = await res.blob();
      break;
    } catch {
      // Timeout or network error — retry with longer timeout
      continue;
    }
  }

  if (!imageBlob) {
    return NextResponse.json({ error: 'AI generation timed out' }, { status: 504 });
  }

  // Upload to Supabase Storage
  const ext = imageBlob.type.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, imageBlob, {
      contentType: imageBlob.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
