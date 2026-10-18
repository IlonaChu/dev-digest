/* Last-resort boundary — replaces the root layout, so no intl provider, theme or
   globals.css: copy is hardcoded and styles are inline. */
"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 48, background: "#0d1117", color: "#e6edf3" }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>DevDigest failed to load</h1>
        <p style={{ opacity: 0.7, marginBottom: 16 }}>An unexpected error broke the app shell.</p>
        <button type="button" onClick={reset} style={{ padding: "6px 14px", cursor: "pointer" }}>
          Retry
        </button>
      </body>
    </html>
  );
}
