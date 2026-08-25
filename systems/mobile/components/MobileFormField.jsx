/* Поле с mobile-UX: 16px (анти-зум iOS), inputmode, autocomplete, тап-зона 48px */
import React from "react";
const MODE = { email: "email", tel: "tel", number: "numeric", url: "url", search: "search" };
export function MobileFormField({ type = "text", label, name, ...rest }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={name} style={{ display: "block", marginBottom: 8 }}>{label}</label>
      <input
        id={name} name={name} type={type}
        inputMode={MODE[type] || "text"} autoComplete={rest.autoComplete || name}
        style={{ fontSize: 16, minHeight: 48, padding: "12px 16px", width: "100%", boxSizing: "border-box" }}
        {...rest}
      />
    </div>
  );
}
