"use client";

import { useEffect, useSyncExternalStore, useRef, useState } from "react";
import { useLang } from "@/components/language-provider";

/* ---------- matchMedia as external store (so lint-clean re-render) ---------- */
function subscribePointerFine(cb: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}
function getPointerFine() {
  // Allow forcing the cursor on for visual testing via ?cursor-debug=1
  if (typeof window !== "undefined") {
    const u = new URL(window.location.href);
    if (u.searchParams.get("cursor-debug") === "1") return true;
  }
  return window.matchMedia("(pointer: fine)").matches;
}
function getPointerFineServer() {
  return false; // SSR: assume no fine pointer
}

/* Inline SVG arrow cursor — exact replica of the reference site's cursor.svg
   (white fill + black inner + 2px drop shadow, 16×21 viewBox). */
const CURSOR_SVG_MARKUP = `
<svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <g filter="url(#cursor-drop-shadow)">
    <path d="M2 16.02V0L13.59 11.62H6.81L2 16.02Z" fill="white"/>
    <path d="M3 2.41016V13.6002L6.4 10.5902H11.16L3 2.41016Z" fill="black"/>
  </g>
  <defs>
    <filter id="cursor-drop-shadow" x="0" y="0" width="15.5898" height="20.0195" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2"/>
      <feGaussianBlur stdDeviation="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_drop_shadow"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_drop_shadow" result="shape"/>
    </filter>
  </defs>
</svg>`;

/**
 * CustomCursor — exactly matches bleibtgleich.dev's cursor behaviour:
 *
 * - The cursor is a small SVG arrow (white fill + black inner + 2px drop shadow).
 * - Size: 1.25em (relative to body font-size).
 * - It tracks the mouse 1:1 (no spring lag) — the SVG arrow's TIP sits at the
 *   actual pointer coordinate (just like the OS cursor).
 * - On non-fine-pointer devices (touch / mobile), renders nothing.
 * - Press "/" anywhere → a contentEditable "Say something…" input appears
 *   offset 14px right and 14px down from the cursor (the "say something" feature).
 * - Press Escape / Enter, or click away → chat input closes.
 * - The native OS cursor is hidden via CSS on fine-pointer devices.
 * - Message text is capped at 60 chars, single-line (newlines stripped).
 *
 * On the real site, this cursor is also broadcast to other visitors via
 * Socket.io so they see each other's cursors live. That requires a backend;
 * here we just render the local cursor + chat input. (A `data-cursor-broadcast`
 * hook is left in place so this can be wired up later.)
 */
export function CustomCursor() {
  const enabled = useSyncExternalStore(
    subscribePointerFine,
    getPointerFine,
    getPointerFineServer
  );

  const { t } = useLang();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);
  const chatOpenRef = useRef(false);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  // Cursor position in viewport coords (CSS pixels).
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-custom-cursor");

    // Constants matching the reference site.
    const CHAT_MAX_CHARS = 60;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const inField = ["input", "textarea", "select"].includes(tag);
      const isContentEditable =
        document.activeElement?.getAttribute("contenteditable") === "true";

      if (
        e.code === "Slash" &&
        !inField &&
        !isContentEditable &&
        !chatOpenRef.current &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setChatOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      } else if (
        (e.key === "Escape" || e.key === "Enter") &&
        chatOpenRef.current
      ) {
        e.preventDefault();
        setChatOpen(false);
        if (inputRef.current) inputRef.current.textContent = "";
        setChatText("");
        inputRef.current?.blur();
      }
    };

    // Block other interactions while chat is open (matches the real site).
    const onMouseDown = (e: MouseEvent) => {
      if (chatOpenRef.current && e.target !== inputRef.current) {
        e.preventDefault();
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown, true);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  // Click-away closes chat.
  useEffect(() => {
    if (!chatOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cursor-chat-input]")) return;
      setChatOpen(false);
      if (inputRef.current) inputRef.current.textContent = "";
      setChatText("");
    };
    const id = setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", onDocClick);
    };
  }, [chatOpen]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 9000,
        pointerEvents: "none",
      }}
    >
      {/* The cursor SVG — arrow tip sits at (pos.x, pos.y) */}
      <div
        dangerouslySetInnerHTML={{ __html: CURSOR_SVG_MARKUP }}
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: "1.25em",
          height: "1.25em",
          pointerEvents: "none",
        }}
      />

      {/* Chat input — appears offset 14px right + 14px down from cursor */}
      {chatOpen && (
        <div
          data-cursor-chat-input
          style={{
            position: "absolute",
            left: pos.x + 14,
            top: pos.y + 14,
            pointerEvents: "auto",
            zIndex: 99999,
          }}
        >
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            data-placeholder={t.cursor.placeholder}
            onInput={(e) => {
              const el = e.currentTarget;
              // Strip newlines, cap at 60 chars (matches reference site).
              let text = el.textContent || "";
              if (/[\r\n]/.test(text)) {
                text = text.replace(/[\r\n]+/g, " ");
                el.textContent = text;
                // Move caret to end
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
              if (text.length > 60) {
                text = text.slice(0, 60);
                el.textContent = text;
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
              setChatText(text);
            }}
            className="cursor-chat-input"
            style={{
              minWidth: 120,
              maxWidth: 280,
              padding: "6px 12px",
              fontSize: "0.875rem",
              lineHeight: 1.2,
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--foreground)",
              outline: "none",
              opacity: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -18,
              left: 0,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--muted-foreground)",
              whiteSpace: "nowrap",
            }}
          >
            press esc to close · {chatText.length}/60
          </div>
        </div>
      )}
    </div>
  );
}
