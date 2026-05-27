const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const GOOGLE_DRIVE_EXPORT_URL = "https://www.googleapis.com/drive/v3/files/{fileId}/export";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
}

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google Drive API not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
    );
  }

  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getGoogleCredentials();

  if (!refreshToken) {
    throw new Error(
      "No Google refresh token available. Complete OAuth flow to authorize Google Drive access."
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to refresh Google token: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function searchDocuments(
  query: string,
  maxResults: number = 5
): Promise<DriveFile[]> {
  const accessToken = await getAccessToken();

  const q = encodeURIComponent(
    `(name contains '${query}' or fullText contains '${query}') and trashed = false`
  );
  const fields = encodeURIComponent(
    "files(id,name,mimeType,webViewLink,size,createdTime)"
  );
  const url = `${GOOGLE_DRIVE_FILES_URL}?q=${q}&pageSize=${maxResults}&fields=${fields}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Drive search failed: ${err}`);
  }

  const data = await response.json();
  return (data.files || []) as DriveFile[];
}

export async function getDocumentContent(
  fileId: string
): Promise<{ text: string; mimeType: string; name: string }> {
  const accessToken = await getAccessToken();

  const metaUrl = `${GOOGLE_DRIVE_FILES_URL}/${fileId}?fields=name,mimeType`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    throw new Error(`Failed to get file metadata: ${await metaRes.text()}`);
  }

  const meta = await metaRes.json();
  const { name, mimeType } = meta;

  const isGoogleDoc = mimeType.startsWith("application/vnd.google-apps.");
  const isTextExportable = [
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.presentation",
  ].includes(mimeType);

  let text: string;

  if (isGoogleDoc && isTextExportable) {
    const exportMime =
      mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : "text/plain";
    const exportUrl = GOOGLE_DRIVE_EXPORT_URL.replace("{fileId}", fileId);
    const exportRes = await fetch(`${exportUrl}?mimeType=${exportMime}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!exportRes.ok) {
      throw new Error(`Failed to export document: ${await exportRes.text()}`);
    }

    text = await exportRes.text();
  } else if (mimeType === "text/plain" || mimeType === "application/pdf") {
    const downloadUrl = `${GOOGLE_DRIVE_FILES_URL}/${fileId}?alt=media`;
    const dlRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!dlRes.ok) {
      throw new Error(`Failed to download file: ${await dlRes.text()}`);
    }

    if (mimeType === "application/pdf") {
      const buffer = await dlRes.arrayBuffer();
      const pdfText = extractPdfText(buffer);
      text = pdfText || "[PDF content could not be extracted as text]";
    } else {
      text = await dlRes.text();
    }
  } else {
    text = `[File type '${mimeType}' cannot be read as text. View it at the file's web link.]`;
  }

  const maxLength = 15000;
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + `\n\n[... truncated, full document is ${text.length} characters ...]`;
  }

  return { text, mimeType, name };
}

function extractPdfText(buffer: ArrayBuffer): string | null {
  try {
    const uint8 = new Uint8Array(buffer);
    let text = "";
    const decoder = new TextDecoder("utf-8");
    const CHUNK = 65536;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      const slice = uint8.slice(i, i + CHUNK);
      text += decoder.decode(slice, { stream: i + CHUNK < uint8.length });
    }

    const textParts: string[] = [];
    const streamRegex = /\/Filter\s*\/FlateDecode[\s\S]*?stream\s*([\s\S]*?)endstream/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null) {
      const streamContent = match[1].replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const cleaned = streamContent
        .replace(/[^\x20-\x7E\n\t]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 10) {
        textParts.push(cleaned);
      }
    }

    if (textParts.length > 0) {
      return textParts.join("\n\n---\n\n").slice(0, 15000);
    }

    const btRegex = /BT\s*([\s\S]*?)ET/g;
    const textBlocks: string[] = [];
    while ((match = btRegex.exec(text)) !== null) {
      const block = match[1];
      const tjRegex = /Tj\s+(\([^)]*\)|'[^']*')/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const content = tjMatch[1].slice(1, -1);
        if (content.trim()) textBlocks.push(content);
      }
    }

    return textBlocks.length > 0
      ? textBlocks.join(" ").slice(0, 15000)
      : null;
  } catch {
    return null;
  }
}