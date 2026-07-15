"use client";

import { useState } from "react";

export function DownloadPdfButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    try {
      setBusy(true);
      const [{ pdf }, { LitepaperDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./LitepaperPdf"),
      ]);
      const blob = await pdf(<LitepaperDocument />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "longbow-litepaper.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={busy}
      className={`btn btn-primary flex items-center gap-2 px-5 py-3 ${className}`}
    >
      {busy ? "GENERATING…" : "DOWNLOAD PDF"}
      {!busy && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
        </svg>
      )}
    </button>
  );
}
