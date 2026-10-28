"use client";

import { ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  // Keeps the confirm button off until the operator has done what the dialog asks (for example typed a word).
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

// Native <dialog> gives focus trapping and Escape handling for free.
export default function ConfirmDialog({ open, title, confirmLabel, tone = "danger", confirmDisabled, onConfirm, onCancel, children }: Props) {
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
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className={tone === "danger" ? "btn danger" : "btn"} onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
