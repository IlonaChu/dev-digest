import React from "react";

export function Toggle({
  on,
  onChange,
  size = 18,
  disabled = false,
  title,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  size?: number;
  /** A real `disabled` button: skipped by Tab, announced as unavailable, ignores clicks. */
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  /** Id of the element that explains the state (e.g. why the switch is locked). */
  "aria-describedby"?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      style={{
        width: size * 1.85,
        height: size + 4,
        borderRadius: 99,
        border: "none",
        padding: 2,
        background: on ? "var(--accent)" : "var(--border-strong)",
        transition: "background .15s",
        position: "relative",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        style={{
          display: "block",
          width: size,
          height: size,
          borderRadius: 99,
          background: "#fff",
          transform: on ? `translateX(${size * 0.85}px)` : "none",
          transition: "transform .15s",
          boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        }}
      />
    </button>
  );
}
