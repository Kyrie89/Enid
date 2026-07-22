import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { S } from "../styles";
import { uid } from "../lib/utils";
import { FormRow } from "./shared";

export function LocationsEditor({ draft, setDraft }) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const locations = draft.locations || [];

  const addLocation = () => {
    if (!label.trim() || !address.trim()) {
      setError("Add a location name and address before adding.");
      return;
    }
    setError("");
    setDraft({
      ...draft,
      locations: [...locations, { id: uid(), label: label.trim(), address: address.trim(), phone: phone.trim(), notes: notes.trim() }],
    });
    setLabel("");
    setAddress("");
    setPhone("");
    setNotes("");
  };

  const removeLocation = (id) => {
    setDraft({ ...draft, locations: locations.filter((l) => l.id !== id) });
  };

  return (
    <FormRow label={`Additional locations (${locations.length}) — for organizations with more than one site`}>
      {locations.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {locations.map((l) => (
            <div key={l.id} style={S.scheduleEditRow}>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{l.label}</span> — {l.address}
                {l.phone ? ` · ${l.phone}` : ""}
                {l.notes ? ` (${l.notes})` : ""}
              </span>
              <button style={S.iconBtn} onClick={() => removeLocation(l.id)} aria-label={`Remove ${l.label} location`}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={S.scheduleAddRow}>
        <input style={{ ...S.input, flex: "0 0 120px" }} placeholder="Location name" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input style={{ ...S.input, flex: 1 }} placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input style={{ ...S.input, flex: "0 0 140px" }} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input style={{ ...S.input, flex: 1 }} placeholder="Notes (optional, e.g. different hours)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button style={S.connectPickerBtn} onClick={addLocation}><Plus size={13} /> Add</button>
      </div>
      {error && <div style={{ color: "#b3413a", fontSize: 12.5, marginTop: 6 }}>{error}</div>}
    </FormRow>
  );
}
