import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Configure Supabase client with custom storage configuration
// The storage container expects routes at /object/bucket/file, not /storage/v1/object/bucket/file
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
});

export async function uploadPhoto(
  inspectionId: string,
  photoData: string,
  index: number
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${index}.jpg`;
  const filePath = `${inspectionId}/${fileName}`;

  const buffer = Buffer.from(photoData, 'base64');

  const { error } = await supabase.storage
    .from('inspection-photos')
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('inspection-photos')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function deletePhotos(photoUrls: string[]): Promise<void> {
  const paths = photoUrls.map((url) => {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/inspection-photos/');
    return pathParts[1];
  });

  const { error } = await supabase.storage.from('inspection-photos').remove(paths);

  if (error) {
    console.error('Failed to delete photos:', error);
  }
}
