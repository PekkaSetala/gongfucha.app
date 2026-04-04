"use client";

import { useEffect, useState } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame: trigger transition
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      const timeout = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timeout);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 250ms var(--ease-out)",
        }}
      />

      {/* Sheet — slides up on mobile, slides in from right on desktop */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-bg rounded-t-[20px] max-h-[85vh] overflow-y-auto md:right-0 md:left-auto md:top-0 md:bottom-0 md:w-[400px] md:rounded-t-none md:rounded-l-[20px] md:max-h-none"
        style={{
          transform: visible
            ? "translateY(0)"
            : "translateY(100%)",
          transition: `transform 300ms var(--ease-drawer)`,
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-tertiary"
            style={{ transition: "color 150ms var(--ease-out), transform 160ms var(--ease-out)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}
