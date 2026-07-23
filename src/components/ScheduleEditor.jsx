import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { S } from "../styles";
import { DAYS, DAY_SHORT } from "../lib/taxonomy";
import { uid } from "../lib/utils";
import { FormRow } from "./shared";

export function ScheduleEditor({ draft, setDraft }) {
  const [days, setDays] = useState(["Monday"]);
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [frequency, setFrequency] = useState("Weekly");
  const [error, setError] = useState("");
  const schedule = draft.schedule || [];

  const toggleDay = (d) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const addOccurrence = () => {
    if (days.length === 0 || !time.trim() || !label.trim()) {
      setError("Pick at least one day, then fill in a time and description before adding.");
      return;
    }
    setError("");
    const entries = days.map((d) => ({ id: uid(), day: d, time: time.trim(), label: label.trim(), frequency: frequency.trim() || "Weekly" }));
    setDraft({ ...draft, schedule: [...schedule, ...entries] });
    setTime("");
    setLabel("");
  };

  const removeOccurrence = (id) => {
    setDraft({ ...draft, schedule: schedule.filter((s) => s.id !== id) });
  };

  return (
    <FormRow label={`Weekly schedule (${schedule.length}) — what's available and when`}>
      {schedule.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {DAYS.map((d) => {
            const occs = schedule.filter((s) => s.day === d);
            if (occs.length === 0) return null;
            return occs.map((o) => (
              <div key={o.id} style={S.scheduleEditRow}>
                <span style={{ fontWeight: 700, width: 36, flexShrink: 0 }}>{DAY_SHORT[d]}</span>
                <span style={{ flex: 1 }}>{o.time} — {o.label}{o.frequency !== "Weekly" ? ` (${o.frequency})` : ""}</span>
                <button style={S.iconBtn} onClick={() => removeOccurrence(o.id)} aria-label={`Remove ${DAY_SHORT[d]} ${o.time} ${o.label}`}><X size={13} /></button>
              </div>
            ));
          })}
        </div>
      )}

      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#9aa0a6", marginBottom: 6, letterSpacing: 0.3 }}>
        DAYS (pick one or more)
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {DAYS.map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => toggleDay(d)}
            aria-pressed={days.includes(d)}
            style={{ ...S.dayChip, ...(days.includes(d) ? S.dayChipActive : {}) }}
          >
            {DAY_SHORT[d]}
          </button>
        ))}
      </div>

      <div style={S.scheduleAddRow}>
        <input style={{ ...S.input, flex: "0 0 110px" }} placeholder="Time (e.g. 9:00 AM)" value={time} onChange={(e) => setTime(e.target.value)} />
        <input style={{ ...S.input, flex: 1 }} placeholder="What's available (e.g. Food pantry)" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Frequency (default Weekly)" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        <button style={S.connectPickerBtn} onClick={addOccurrence}><Plus size={13} /> Add{days.length > 1 ? ` (${days.length} days)` : ""}</button>
      </div>
      {error && <div style={{ color: "#b3413a", fontSize: 12.5, marginTop: 6 }}>{error}</div>}
    </FormRow>
  );
}
