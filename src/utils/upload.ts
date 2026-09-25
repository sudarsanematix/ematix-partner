const API_BASE = 'http://192.168.1.34:4000';

export async function uploadDocument(uri: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('document', {
      uri,
      name: `doc-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data?.fileUrl) {
      return `${API_BASE}${data.fileUrl}`;
    }
    return null;
  } catch (e) {
    console.error('[Upload Error]', e);
    return null;
  }
}