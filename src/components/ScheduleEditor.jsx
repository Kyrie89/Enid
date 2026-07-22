import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { S } from "../styles";
import { DAYS, DAY_SHORT } from "../lib/taxonomy";
import { uid } from "../lib/utils";
import { FormRow } from "./shared";

export function ScheduleEditor({ draft, setDraft }) {
  const [day, setDay] = useState("Monday");
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [frequency, setFrequency] = useState("Weekly");
  const schedule = draft.schedule || [];

  const addOccurrence = () => {
    if (!time.trim() || !label.trim()) return;
    setDraft({ ...draft, schedule: [...schedule, { id: uid(), day, time: time.trim(), label: label.trim(), frequency: frequency.trim() || "Weekly" }] });
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
      <div style={S.scheduleAddRow}>
        <select style={{ ...S.input, flex: "0 0 100px" }} value={day} onChange={(e) => setDay(e.target.value)}>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
        </select>
        <input style={{ ...S.input, flex: "0 0 110px" }} placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input style={{ ...S.input, flex: 1 }} placeholder="What's available (e.g. Food pantry)" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Frequency (default Weekly)" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        <button style={S.connectPickerBtn} onClick={addOccurrence}><Plus size={13} /> Add</button>
      </div>
    </FormRow>
  );
}
