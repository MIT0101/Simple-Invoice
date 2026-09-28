"use client";

import { useEffect, useRef, useState } from "react";
import { Button, buttonClasses } from "@/components/ui";
import { routes } from "@/lib/routes";

type FrameRef = { current: HTMLIFrameElement | null };

function removeFrame(frameRef: FrameRef) {
  frameRef.current?.remove();
  frameRef.current = null;
}

export function InvoicePdfButtons({ invoiceId, version }: { invoiceId: number; version: string }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => () => removeFrame(frameRef), []);

  function print() {
    const pdfUrl = routes.invoicePdf(invoiceId, { version });
    removeFrame(frameRef);
    setPreparing(true);

    // The browser's PDF viewer only prints from a rendered frame: hide it by size, not display:none.
    const frame = document.createElement("iframe");
    frame.title = "Invoice PDF for printing";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    frame.onload = () => {
      setPreparing(false);
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(pdfUrl, "_blank", "noopener");
      }
    };
    frame.src = pdfUrl;
    document.body.appendChild(frame);
    frameRef.current = frame;
  }

  return (
    <>
      <a
        href={routes.invoicePdf(invoiceId, { download: true, version })}
        download
        className={buttonClasses("secondary")}
      >
        Download PDF
      </a>
      <Button variant="secondary" onClick={print} disabled={preparing}>
        {preparing ? "Preparing…" : "Print"}
      </Button>
    </>
  );
}
