import { File, UploadType } from 'expo-file-system';
import { API_BASE } from './api';

export type KycDocument = {
  docKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
};

export type UploadFailure = {
  /** Raw transport/native error, when the request never reached the server. */
  cause?: unknown;
  /** HTTP status when the server answered. */
  status?: number;
  /** Backend `error` / `message` code, when it sent one. */
  code?: string;
  /** Human-readable reason safe to show the partner. */
  reason: string;
};

/**
 * Uploads one KYC document and records it against the authenticated partner.
 *
 * The file bytes and the MongoDB PartnerDocument row are created together, so
 * every file on disk is traceable to the partner who uploaded it. The raw
 * returned fileName is never persisted on the client -- GET /api/kyc/me is the
 * authority on what is currently on file.
 *
 * SDK 57 note: `FileSystemUploadType` and `FileSystem.uploadAsync` were removed
 * from the `expo-file-system` root export. They now live under
 * `expo-file-system/legacy`, which throws at runtime for the deprecated
 * `uploadAsync` path. The supported API is `new File(uri).upload(url, options)`
 * with the `UploadType` enum, so that is what this uses.
 *
 * `docKey` travels as a multipart form field because the backend reads it from
 * `req.body` after multer has parsed the request. It is still server-validated
 * against the canonical document list; a client cannot invent a slot.
 */
export async function uploadDocument(
  uri: string,
  docKey: string,
  token: string
): Promise<KycDocument | UploadFailure | null> {
  let file: File;
  try {
    file = new File(uri);
  } catch (e) {
    // A picked asset can fail to materialise (cache evicted, permission revoked
    // between picking and uploading).
    return { cause: e, reason: 'Could not read the selected file. Please pick it again.' };
  }

  if (!file.exists) {
    return { reason: 'The selected file is no longer available. Please pick it again.' };
  }

  let result;
  try {
    result = await file.upload(`${API_BASE}/api/upload`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'document',
      mimeType: file.type || undefined,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      parameters: {
        docKey,
      },
    });
  } catch (e) {
    console.error('[Upload Error]', e);
    return {
      cause: e,
      reason: 'Upload failed. Check your connection and try again.',
    };
  }

  let data: any = null;
  try {
    data = JSON.parse(result.body);
  } catch {
    data = null;
  }

  if (result.status < 200 || result.status >= 300 || !data?.success) {
    const code = data?.error ?? data?.message;
    console.error('[Upload Error]', { status: result.status, code, body: result.body });
    return {
      status: result.status,
      code,
      // 413 and the size limits are worth distinguishing from a generic
      // rejection, because the fix for the partner is different.
      reason:
        result.status === 413
          ? 'That image is too large. Try a smaller photo.'
          : code === 'already_approved'
            ? 'Your KYC is already approved, so documents cannot be changed.'
            : data?.message || 'Upload rejected. Please try again.',
    };
  }

  if (!data?.document) {
    return { reason: 'Upload did not return a document. Please try again.' };
  }

  return data.document as KycDocument;
}
