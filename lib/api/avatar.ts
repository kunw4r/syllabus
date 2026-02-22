import { createClient } from '@/lib/supabase/client';

/**
 * Upload an avatar image to Supabase Storage.
 * Accepts a data URL (base64) or a Blob.
 * Returns the public CDN URL.
 */
export async function uploadAvatar(
  userId: string,
  imageData: string | Blob,
): Promise<string> {
  const supabase = createClient();

  let blob: Blob;
  let ext = 'jpg';

  if (typeof imageData === 'string') {
    // data:image/jpeg;base64,... or data:image/png;base64,...
    const match = imageData.match(/^data:image\/(\w+);base64,/);
    if (!match) throw new Error('Invalid data URL');
    ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    blob = new Blob([bytes], { type: `image/${match[1]}` });
  } else {
    blob = imageData;
    if (blob.type.includes('png')) ext = 'png';
    else if (blob.type.includes('webp')) ext = 'webp';
  }

  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Check if a URL is a data URL that should be migrated to storage.
 */
export function isDataUrl(url: string | undefined): boolean {
  return !!url && url.startsWith('data:image/');
}
