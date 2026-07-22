import React from "react";
import { X, ShieldCheck, Link2 } from "lucide-react";
import { S } from "../styles";
import { CATEGORY_META, ISSUE_TAGS, BARRIER_TAGS } from "../lib/taxonomy";
import { FormRow, TagChip } from "./shared";
import { ScheduleEditor } from "./ScheduleEditor";

export function EditForm({
  draft, setDraft, resources, onSave, onCancel,
  connectPicker, setConnectPicker, toggleConnection, toggleDraftTag,
  editorDisplayName,
}) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const others = resources.filter((r) => r.id !== draft.id);
  const secondary = draft.secondaryCategories || [];
  const toggleSecondary = (key) => {
    setDraft({
      ...draft,
      secondaryCategories: secondary.includes(key) ? secondary.filter((k) => k !== key) : [...secondary, key],
    });
  };

  return (
    <div style={S.detailInner}>
      <div style={S.formHeader}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{resources.some((r) => r.id === draft.id) ? "Edit resource" : "Add resource"}</h2>
        <button style={S.iconBtn} onClick={onCancel} aria-label="Cancel and close form"><X size={16} /></button>
      </div>

      <FormRow label="Editing as">
        <div style={{ fontSize: 13.5, color: "#5c6066", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
          {editorDisplayName || "Unattributed"}
        </div>
      </FormRow>

      <FormRow label="Name *"><input style={S.input} value={draft.name} onChange={set("name")} placeholder="Organization name" /></FormRow>

      <FormRow label="Category">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              onClick={() => setDraft({ ...draft, category: key })}
              style={{ ...S.catPick, borderColor: draft.category === key ? meta.color : "#e4e2dc", background: draft.category === key ? meta.color + "14" : "#fff", color: draft.category === key ? meta.color : "#5c6066" }}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </FormRow>

      <FormRow label="Also list under (optional — for resources that span categories)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(CATEGORY_META).filter(([key]) => key !== draft.category).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              onClick={() => toggleSecondary(key)}
              style={{ ...S.catPick, borderColor: secondary.includes(key) ? meta.color : "#e4e2dc", background: secondary.includes(key) ? meta.color + "14" : "#fff", color: secondary.includes(key) ? meta.color : "#5c6066" }}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </FormRow>

      <FormRow label="Subcategory / service type">
        <input style={S.input} value={draft.subcategory} onChange={set("subcategory")} placeholder="e.g. Outpatient IOP, food pantry, Al-Anon meeting" />
      </FormRow>

      <FormRow label="Address"><input style={S.input} value={draft.address} onChange={set("address")} placeholder="Street, Enid, OK" /></FormRow>

      <div style={{ display: "flex", gap: 10 }}>
        <FormRow label="Phone" grow><input style={S.input} value={draft.phone} onChange={set("phone")} placeholder="580-..." /></FormRow>
        <FormRow label="Website" grow><input style={S.input} value={draft.website} onChange={set("website")} placeholder="https://" /></FormRow>
      </div>

      <FormRow label="Population served">
        <input style={S.input} value={draft.populations} onChange={set("populations")} placeholder="e.g. adult men, adolescents, corrections-involved" />
      </FormRow>

      <FormRow label="Won't work for / exclusions (saves a wasted referral)">
        <input style={S.input} value={draft.exclusions || ""} onChange={set("exclusions")} placeholder="e.g. 18+ only, no active psychosis, no walk-ins" />
      </FormRow>

      <FormRow label="Insurance / cost">
        <input style={S.input} value={draft.insurance} onChange={set("insurance")} placeholder="e.g. Medicaid, sliding scale, free" />
      </FormRow>

      <ScheduleEditor draft={draft} setDraft={setDraft} />

      <FormRow label="Issues this addresses">
        <div style={S.tagWrap}>
          {ISSUE_TAGS.map((t) => (
            <TagChip key={t} label={t} active={draft.issues?.includes(t)} onClick={() => toggleDraftTag("issues", t)} />
          ))}
        </div>
      </FormRow>

      <FormRow label="Barriers it removes">
        <div style={S.tagWrap}>
          {BARRIER_TAGS.map((t) => (
            <TagChip key={t} label={t} active={draft.barriers?.includes(t)} onClick={() => toggleDraftTag("barriers", t)} />
          ))}
        </div>
      </FormRow>

      <FormRow label="Notes">
        <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={draft.notes} onChange={set("notes")} placeholder="Hours, referral process, anything staff should know" />
      </FormRow>

      <FormRow label="Verification">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={S.connectPickerBtn}
            onClick={() => setDraft({ ...draft, verifiedDate: new Date().toISOString().slice(0, 10) })}
          >
            <ShieldCheck size={13} /> Mark verified today
          </button>
          <span style={{ fontSize: 12.5, color: "#8a9099", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
            {draft.verifiedDate ? `Last verified ${draft.verifiedDate}` : "Never verified"}
          </span>
        </div>
      </FormRow>

      <FormRow label="Status">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, status: "active" })}
            style={{ ...S.catPick, borderColor: draft.status !== "closed" ? "#2f6f5e" : "#e4e2dc", background: draft.status !== "closed" ? "#2f6f5e14" : "#fff", color: draft.status !== "closed" ? "#2f6f5e" : "#5c6066" }}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, status: "closed" })}
            style={{ ...S.catPick, borderColor: draft.status === "closed" ? "#b3413a" : "#e4e2dc", background: draft.status === "closed" ? "#b3413a14" : "#fff", color: draft.status === "closed" ? "#b3413a" : "#5c6066" }}
          >
            Closed / defunct
          </button>
        </div>
      </FormRow>

      <FormRow label={`Connections (${draft.connections.length})`}>
        <button style={S.connectPickerBtn} onClick={() => setConnectPicker(!connectPicker)}>
          <Link2 size={13} /> {connectPicker ? "Hide list" : "Link to other resources"}
        </button>
        {connectPicker && (
          <div style={S.connectList}>
            {others.length === 0 && <div style={{ fontSize: 13, color: "#9aa0a6", padding: 8 }}>Add other resources first.</div>}
            {others.map((r) => {
              const on = draft.connections.includes(r.id);
              return (
                <button key={r.id} onClick={() => toggleConnection(r.id)} style={{ ...S.connectPickItem, background: on ? "#2f6f5e14" : "#fff", borderColor: on ? "#2f6f5e" : "#eceae4" }}>
                  <span style={{ flex: 1, textAlign: "left" }}>{r.name}</span>
                  {on && <span style={{ color: "#2f6f5e", fontSize: 12, fontWeight: 600 }}>Linked</span>}
                </button>
              );
            })}
          </div>
        )}
      </FormRow>

      <div style={S.formActions}>
        <button style={S.saveBtn} onClick={() => onSave()}>Save resource</button>
        <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
