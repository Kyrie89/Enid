import React from "react";
import { ExternalLink } from "lucide-react";
import { S } from "../styles";
import { CATEGORY_META } from "../lib/taxonomy";

export function CatChip({ active, onClick, label, count, color = "#2f3437", Icon }) {
  return (
    <button onClick={onClick} aria-pressed={active} style={{ ...S.chip, borderColor: active ? color : "#e4e2dc", background: active ? color + "14" : "#fff", color: active ? color : "#5c6066" }}>
      {Icon && <Icon size={13} style={{ marginRight: 5 }} />}
      {label}<span style={{ opacity: 0.6, marginLeft: 5 }}>{count}</span>
    </button>
  );
}

export function TagChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...S.tagChip,
        background: active ? "#2f6f5e" : "#fff",
        color: active ? "#fff" : "#5c6066",
        borderColor: active ? "#2f6f5e" : "#e4e2dc",
      }}
    >
      {label}
    </button>
  );
}

export function Field({ icon: Icon, label, value, href, external }) {
  const content = (
    <div style={S.fieldRow}>
      <Icon size={14} color="#8a9099" style={{ marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={S.fieldLabel}>{label}</div>
        <div style={S.fieldValue}>{value} {external && <ExternalLink size={11} style={{ marginLeft: 3, verticalAlign: "middle" }} />}</div>
      </div>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>{content}</a>;
  return content;
}

export function InfoBlock({ icon: Icon, title, text, tone }) {
  const color = tone === "warn" ? "#b3413a" : tone === "highlight" ? "#2f6f5e" : S.infoBlockTitle.color;
  return (
    <div style={S.infoBlock}>
      <div style={{ ...S.infoBlockTitle, color }}><Icon size={13} /> {title}</div>
      <div style={S.infoBlockText}>{text}</div>
    </div>
  );
}

export function ConnectionRow({ resource, direction, onClick }) {
  const meta = CATEGORY_META[resource.category];
  return (
    <button style={S.connRow} onClick={onClick}>
      <span style={{ ...S.connDot, background: meta.color }} />
      <span style={{ flex: 1, textAlign: "left" }}>
        <span style={{ fontWeight: 600, color: "#2f3437" }}>{resource.name}</span>
        <span style={{ color: "#6b7178", marginLeft: 6, fontSize: 12 }}>{direction}</span>
      </span>
    </button>
  );
}

export function FormRow({ label, children, grow, htmlFor }) {
  return (
    <div style={{ marginBottom: 14, flex: grow ? 1 : undefined }}>
      {htmlFor ? <label style={S.formLabel} htmlFor={htmlFor}>{label}</label> : <div style={S.formLabel}>{label}</div>}
      {children}
    </div>
  );
}
