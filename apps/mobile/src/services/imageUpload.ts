import { authenticatedApiRequest, isApiConfigured } from './api';

interface SignedUpload {
  uploadUrl: string;
  fileUrl: string;
  contentType: string;
}

function contentTypeForUri(uri: string): string {
  const lower = uri.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Uploads a locally-captured image to object storage via a presigned PUT and
 * returns its public URL. Returns null (so the caller keeps the local URI) when
 * the API/mock mode is active, the URI is already remote, or storage is not
 * configured on the backend.
 */
export async function uploadInventoryImage(uri: string | undefined): Promise<string | null> {
  if (!isApiConfigured || !uri || !uri.startsWith('file')) return null;

  const contentType = contentTypeForUri(uri);
  let signed: SignedUpload;
  try {
    signed = await authenticatedApiRequest<SignedUpload>('/v1/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    });
  } catch {
    // 501 storage_not_configured or any sign failure: fall back to local URI.
    return null;
  }

  try {
    const blob = await (await fetch(uri)).blob();
    const put = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': signed.contentType },
      body: blob,
    });
    if (!put.ok) return null;
    return signed.fileUrl;
  } catch {
    return null;
  }
}
