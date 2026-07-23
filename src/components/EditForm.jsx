import React, { useState } from "react";
import { X, ShieldCheck, Link2 } from "lucide-react";
import { S } from "../styles";
import { CATEGORY_META, ISSUE_TAG_GROUPS, BARRIER_TAGS } from "../lib/taxonomy";
import { FormRow, TagChip } from "./shared";
import { ScheduleEditor } from "./ScheduleEditor";
import { LocationsEditor } from "./LocationsEditor";

export function EditForm({
  draft, setDraft, resources, onSave, onCancel,
  connectPicker, setConnectPicker, toggleConnection, toggleDraftTag,
  editorName, setEditorName,
}) {
  const [nameError, setNameError] = useState(false);
  const [connectSearch, setConnectSearch] = useState("");
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

      <FormRow label="Editing as" htmlFor="field-editor-name">
        <input
          id="field-editor-name"
          style={{ ...S.input, maxWidth: 260 }}
          value={editorName}
          onChange={(e) => setEditorName(e.target.value)}
          placeholder="Your name (remembered on this device)"
        />
      </FormRow>

      <FormRow label="Name *" htmlFor="field-name">
        <input
          id="field-name"
          style={{ ...S.input, ...(nameError ? { borderColor: "#b3413a" } : {}) }}
          value={draft.name}
          onChange={(e) => { setNameError(false); set("name")(e); }}
          placeholder="Organization name"
          aria-invalid={nameError || undefined}
        />
        {nameError && <div style={{ color: "#b3413a", fontSize: 12.5, marginTop: 4 }}>Name is required</div>}
      </FormRow>

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: "#f8f7f3", borderRadius: 8 }}>
          {Object.entries(CATEGORY_META).filter(([key]) => key !== draft.category).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              onClick={() => toggleSecondary(key)}
              style={{ ...S.catPick, padding: "5px 10px", fontSize: 11.5, borderColor: secondary.includes(key) ? meta.color : "#e4e2dc", background: secondary.includes(key) ? meta.color + "14" : "#fff", color: secondary.includes(key) ? meta.color : "#5c6066" }}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </FormRow>

      <FormRow label="Subcategory / service type" htmlFor="field-subcategory">
        <input id="field-subcategory" style={S.input} value={draft.subcategory} onChange={set("subcategory")} placeholder="e.g. Outpatient IOP, food pantry, Al-Anon meeting" />
      </FormRow>

      <FormRow label="Parent organization (optional — for orgs that run more than one program)" htmlFor="field-parent-org">
        <input id="field-parent-org" style={S.input} value={draft.parentOrg || ""} onChange={set("parentOrg")} placeholder="e.g. YWCA of Enid" />
      </FormRow>

      <FormRow label="Address" htmlFor="field-address"><input id="field-address" style={S.input} value={draft.address} onChange={set("address")} placeholder="Street, Enid, OK" /></FormRow>

      <div style={{ display: "flex", gap: 10 }}>
        <FormRow label="Phone" grow htmlFor="field-phone"><input id="field-phone" style={S.input} value={draft.phone} onChange={set("phone")} placeholder="580-..." /></FormRow>
        <FormRow label="Website" grow htmlFor="field-website"><input id="field-website" style={S.input} value={draft.website} onChange={set("website")} placeholder="https://" /></FormRow>
      </div>

      <FormRow label="City / town (used for the location filter)" htmlFor="field-city">
        <input id="field-city" style={S.input} value={draft.city || ""} onChange={set("city")} placeholder="e.g. Enid, Kingfisher" />
      </FormRow>

      <FormRow label="Scope">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, isStatewide: false, isCountywide: false })}
            style={{ ...S.catPick, borderColor: !draft.isStatewide && !draft.isCountywide ? "#2f6f5e" : "#e4e2dc", background: !draft.isStatewide && !draft.isCountywide ? "#2f6f5e14" : "#fff", color: !draft.isStatewide && !draft.isCountywide ? "#2f6f5e" : "#5c6066" }}
          >
            City-specific
          </button>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, isStatewide: false, isCountywide: true })}
            style={{ ...S.catPick, borderColor: draft.isCountywide ? "#4a5a8a" : "#e4e2dc", background: draft.isCountywide ? "#4a5a8a14" : "#fff", color: draft.isCountywide ? "#4a5a8a" : "#5c6066" }}
          >
            Countywide (all of Garfield County)
          </button>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, isStatewide: true, isCountywide: false })}
            style={{ ...S.catPick, borderColor: draft.isStatewide ? "#4a5a8a" : "#e4e2dc", background: draft.isStatewide ? "#4a5a8a14" : "#fff", color: draft.isStatewide ? "#4a5a8a" : "#5c6066" }}
          >
            Regional & National
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#6b7178", marginTop: 6, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
          {draft.isStatewide
            ? "A statewide hotline, national program, or out-of-area connection — listed under Regional & National scope instead of by city."
            : draft.isCountywide
            ? "Serves all of Garfield County — shows up no matter which city is selected in the location filter."
            : "Tied to the city/town entered above."}
        </div>
      </FormRow>

      <LocationsEditor draft={draft} setDraft={setDraft} />

      <FormRow label="Population served" htmlFor="field-populations">
        <input id="field-populations" style={S.input} value={draft.populations} onChange={set("populations")} placeholder="e.g. adult men, adolescents, corrections-involved" />
      </FormRow>

      <FormRow label="Age range served (optional)">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="number"
            style={{ ...S.input, width: 90 }}
            value={draft.ageMin ?? ""}
            onChange={(e) => setDraft({ ...draft, ageMin: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Min"
            min={0}
          />
          <span style={{ color: "#6b7178", fontSize: 13 }}>to</span>
          <input
            type="number"
            style={{ ...S.input, width: 90 }}
            value={draft.ageMax ?? ""}
            onChange={(e) => setDraft({ ...draft, ageMax: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Max"
            min={0}
          />
          <span style={{ color: "#6b7178", fontSize: 12.5 }}>Leave both blank if not age-restricted</span>
        </div>
      </FormRow>

      <FormRow label="Won't work for / exclusions (saves a wasted referral)" htmlFor="field-exclusions">
        <input id="field-exclusions" style={S.input} value={draft.exclusions || ""} onChange={set("exclusions")} placeholder="e.g. no active psychosis, no walk-ins, must be a Garfield County resident" />
      </FormRow>

      <FormRow label="Insurance / cost" htmlFor="field-insurance">
        <input id="field-insurance" style={S.input} value={draft.insurance} onChange={set("insurance")} placeholder="e.g. Medicaid, sliding scale, free" />
      </FormRow>

      <ScheduleEditor draft={draft} setDraft={setDraft} />

      <FormRow label="Issues this addresses">
        {ISSUE_TAG_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 10 }}>
            <div style={S.tagGroupLabel}>{group.label}</div>
            <div style={S.tagWrap}>
              {group.tags.map((t) => (
                <TagChip key={t} label={t} active={draft.issues?.includes(t)} onClick={() => toggleDraftTag("issues", t)} />
              ))}
            </div>
          </div>
        ))}
      </FormRow>

      <FormRow label="Barriers it removes">
        <div style={S.tagWrap}>
          {BARRIER_TAGS.map((t) => (
            <TagChip key={t} label={t} active={draft.barriers?.includes(t)} onClick={() => toggleDraftTag("barriers", t)} />
          ))}
        </div>
      </FormRow>

      <FormRow label="Notes" htmlFor="field-notes">
        <textarea id="field-notes" style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={draft.notes} onChange={set("notes")} placeholder="Hours, referral process, anything staff should know" />
      </FormRow>

      <FormRow label="Next step (optional — what should someone do first?)" htmlFor="field-next-step">
        <input id="field-next-step" style={S.input} value={draft.nextStep || ""} onChange={set("nextStep")} placeholder="e.g. Call to schedule an intake appointment" />
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
            {draft.verifiedDate ? `Last confirmed ${draft.verifiedDate}` : "Not yet verified"}
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
            {others.length > 5 && (
              <input
                style={{ ...S.input, marginBottom: 4 }}
                placeholder="Search resources to link..."
                value={connectSearch}
                onChange={(e) => setConnectSearch(e.target.value)}
              />
            )}
            {others.length === 0 && <div style={{ fontSize: 13, color: "#9aa0a6", padding: 8 }}>Add other resources first.</div>}
            {others.filter((r) => r.name.toLowerCase().includes(connectSearch.toLowerCase())).map((r) => {
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
        <button style={S.saveBtn} onClick={() => { if (!draft.name.trim()) { setNameError(true); return; } onSave(); }}>Save resource</button>
        <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
