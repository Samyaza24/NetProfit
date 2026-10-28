"use client";

import { ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

// Native <dialog> gives focus trapping and Escape handling for free.
export default function ConfirmDialog({ open, title, confirmLabel, tone = "danger", onConfirm, onCancel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{children}</p>
      <div className="dialog-actions">
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className={tone === "danger" ? "btn danger" : "btn"} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
