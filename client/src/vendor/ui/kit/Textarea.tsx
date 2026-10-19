import React from "react";

/** REAL controlled textarea. */
export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 5,
  mono,
  style,
  onFocus,
  onBlur,
  ...rest
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows">) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      className={mono ? "mono" : undefined}
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        width: "100%",
        resize: "vertical",
        padding: "10px 12px",
        borderRadius: 7,
        border: `1px solid ${focused ? "var(--accent)" : "var(--border-strong)"}`,
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        fontSize: 14,
        lineHeight: 1.55,
        outline: "none",
        ...style,
      }}
    />
  );
}
