import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function renderPage(params: {
  success: boolean;
  refreshToken?: string | null;
  error?: string;
}) {
  const { success, refreshToken, error } = params;
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive Auth</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; max-width: 520px; width: 100%; margin: 20px; }
    .icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; }
    .success .icon { background: #ecfdf5; color: #10b981; }
    .error .icon { background: #fef2f2; color: #ef4444; }
    h2 { text-align: center; font-size: 20px; margin-bottom: 8px; }
    p { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .token-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px; position: relative; }
    .token-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
    .token-value { font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace; font-size: 12px; color: #334155; word-break: break-all; line-height: 1.6; background: #e2e8f0; padding: 12px; border-radius: 6px; user-select: all; }
    .copy-btn { display: inline-block; padding: 8px 18px; background: #0f172a; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    .copy-btn:hover { background: #1e293b; }
    .copy-btn.copied { background: #10b981; }
    .env-line { font-family: "SF Mono", monospace; font-size: 12px; background: #fefce8; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 8px; margin-top: 16px; color: #92400e; }
    .steps { text-align: left; font-size: 13px; color: #475569; margin-top: 12px; }
    .steps li { margin-bottom: 6px; }
    .steps code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card ${success ? "success" : "error"}">
    <div class="icon">${success ? "&#10003;" : "&#10007;"}</div>
    <h2>${success ? "Authorization Complete" : "Authorization Failed"}</h2>
    ${error ? `<p>${error}</p>` : ""}
    ${success && refreshToken ? `
    <p>Google Drive access granted. Copy your refresh token below into your <code>.env</code> file:</p>
    <div class="token-box">
      <div class="token-label">Refresh Token</div>
      <div class="token-value" id="token">${refreshToken}</div>
      <button class="copy-btn" id="copyBtn" onclick="(()=>{navigator.clipboard.writeText(document.getElementById('token').textContent);const b=document.getElementById('copyBtn');b.textContent='Copied!';b.classList.add('copied');setTimeout(()=>{b.textContent='Copy Token';b.classList.remove('copied')},2000)})()">Copy Token</button>
    </div>
    <div class="env-line">GOOGLE_REFRESH_TOKEN="${refreshToken}"</div>
    <ol class="steps">
      <li>Add the line above to your <code>.env</code> file</li>
      <li>Restart the server: <code>npm run dev</code></li>
      <li>The AI can now search and read your Google Drive documents</li>
    </ol>
    ` : success && !refreshToken ? `
    <p>Authorization succeeded but no refresh token was returned.</p>
    <p class="steps">This happens if you've authorized before. To get a new refresh token:<br/>1. Go to <a href="https://myaccount.google.com/permissions">Google Account Permissions</a><br/>2. Remove this app's access<br/>3. <a href="/api/drive/auth">Click here to re-authorize</a></p>
    ` : ""}
  </div>
</body>
</html>`,
    {
      status: success ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return renderPage({
      success: false,
      error: error ? `Google returned an error: ${error}` : "Missing authorization code. Please try again from the auth page.",
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return renderPage({
      success: false,
      error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
    });
  }

  const redirectUri = `${req.nextUrl.origin}/api/drive/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      return renderPage({
        success: false,
        error: tokenData.error_description || tokenData.error || "Token exchange failed. The authorization code may have expired. Please try again.",
      });
    }

    return renderPage({
      success: true,
      refreshToken: tokenData.refresh_token || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return renderPage({
      success: false,
      error: `Token exchange error: ${msg}`,
    });
  }
}