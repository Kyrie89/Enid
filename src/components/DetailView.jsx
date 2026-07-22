import React from "react";
import {
  MapPin, Phone, Globe, Clock, Users, AlertTriangle, ShieldCheck, Link2,
  Edit3, Trash2, Copy, Navigation,
} from "lucide-react";
import { S } from "../styles";
import { CATEGORY_META, DAYS, DAY_SHORT } from "../lib/taxonomy";
import { getVerificationInfo } from "../lib/utils";
import { Field, InfoBlock, ConnectionRow } from "./shared";

export function DetailView({ resource, resources, onEdit, onDelete, onClose, onJump, audienceMode, showToast, canEdit }) {
  const meta = CATEGORY_META[resource.category];
  const Icon = meta.icon;
  const isClient = audienceMode === "client";
  const connected = resources.filter((r) => resource.connections.includes(r.id));
  const referredBy = resources.filter((r) => r.connections.includes(resource.id) && !resource.connections.includes(r.id));

  const directionsUrl = resource.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address.includes("OK") ? resource.address : resource.address + ", Enid, OK")}`
    : null;

  const shareText = () => {
    const lines = [resource.name];
    if (resource.subcategory) lines.push(resource.subcategory);
    if (resource.address) lines.push(resource.address);
    if (resource.phone) lines.push(resource.phone);
    if (resource.website) lines.push(resource.website);
    if (resource.schedule?.length) {
      lines.push("Hours: " + resource.schedule.map((s) => `${DAY_SHORT[s.day]} ${s.time}`).join(", "));
    }
    return lines.join("\n");
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      showToast?.("Copied — paste into a text message");
    } catch (e) {
      showToast?.("Couldn't copy — try selecting the text manually");
    }
  };

  return (
    <div style={S.detailInner}>
      <div style={S.detailTop}>
        <div style={{ ...S.detailIconWrap, background: meta.color + "1a", color: meta.color }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: meta.color, letterSpacing: 0.3 }}>{meta.label.toUpperCase()}</div>
          <h2 style={{ ...S.detailName, ...(isClient ? { fontSize: 24 } : {}) }}>{resource.name}</h2>
          <div style={S.detailSubtitle}>{resource.subcategory}</div>
        </div>
      </div>

      {isClient && (resource.phone || directionsUrl) && (
        <div style={S.clientActionRow}>
          {resource.phone && (
            <a href={`tel:${resource.phone.replace(/[^0-9+]/g, "")}`} style={S.clientCallBtn}>
              <Phone size={18} /> Call
            </a>
          )}
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noreferrer" style={S.clientDirectionsBtn}>
              <Navigation size={18} /> Directions
            </a>
          )}
        </div>
      )}

      {resource.status === "closed" && (
        <div style={{ ...S.warnBanner, background: "#f0d8d5", color: "#b3413a" }}>
          <AlertTriangle size={14} />
          {isClient ? "This may be closed — try calling first." : `Marked closed${resource.editedDate ? ` as of ${resource.editedDate}` : ""} — kept for reference, don't refer people here.`}
        </div>
      )}

      {!isClient && (() => {
        const v = getVerificationInfo(resource);
        if (v.level === "fresh") return null;
        return (
          <div style={S.warnBanner}>
            <AlertTriangle size={14} />
            {v.level === "never" ? "Never verified" : v.label} — double-check hours, phone, and insurance before referring someone here.
          </div>
        );
      })()}

      <div style={S.fieldGrid}>
        {resource.address && <Field icon={MapPin} label="Address" value={resource.address} href={!isClient ? directionsUrl : null} external={!isClient} />}
        {!isClient && resource.phone && <Field icon={Phone} label="Phone" value={resource.phone} href={`tel:${resource.phone.replace(/[^0-9+]/g, "")}`} />}
        {resource.website && <Field icon={Globe} label="Website" value={resource.website.replace(/^https?:\/\//, "")} href={resource.website} external />}
      </div>

      {resource.locations?.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 6 }}>
          <div style={S.infoBlockTitle}><MapPin size={13} /> Other locations</div>
          {resource.locations.map((l) => {
            const locDirections = l.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address.includes("OK") ? l.address : l.address + ", Enid, OK")}`
              : null;
            return (
              <div key={l.id} style={{ fontSize: 13.5, color: "#3c4146", marginBottom: 6, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>{l.label}</span>
                {" — "}
                {locDirections ? (
                  <a href={locDirections} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{l.address}</a>
                ) : (
                  l.address
                )}
                {l.phone && !isClient && (
                  <> · <a href={`tel:${l.phone.replace(/[^0-9+]/g, "")}`} style={{ color: "inherit" }}>{l.phone}</a></>
                )}
                {l.notes && <div style={{ color: "#9aa0a6", fontSize: 12.5 }}>{l.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {resource.schedule?.length > 0 && (
        <div style={S.meetingBlock}>
          <div style={S.infoBlockTitle}><Clock size={13} /> Weekly schedule</div>
          {DAYS.map((d) => {
            const occs = resource.schedule.filter((s) => s.day === d);
            if (occs.length === 0) return null;
            return (
              <div key={d} style={S.scheduleDayRow}>
                <div style={S.scheduleDayName}>{d}</div>
                {occs.map((o) => (
                  <div key={o.id} style={S.scheduleOcc}>
                    <span style={{ fontWeight: 600 }}>{o.time}</span> — {o.label}
                    {o.frequency && o.frequency !== "Weekly" && <span style={{ color: "#a8632a" }}> ({o.frequency})</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {resource.populations && <InfoBlock icon={Users} title="Population served" text={resource.populations} />}
      {resource.exclusions && <InfoBlock icon={AlertTriangle} title="Won't work for" text={resource.exclusions} tone="warn" />}
      {resource.insurance && <InfoBlock icon={ShieldCheck} title="Insurance / cost" text={resource.insurance} />}

      {(resource.issues?.length > 0 || resource.barriers?.length > 0) && (
        <div style={{ marginTop: 14, borderTop: "1px solid #f0eee8", paddingTop: 12 }}>
          {resource.issues?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={S.pillGroupLabel}>Addresses</div>
              <div style={S.tagWrap}>{resource.issues.map((t) => <span key={t} style={S.pillIssue}>{t}</span>)}</div>
            </div>
          )}
          {resource.barriers?.length > 0 && (
            <div>
              <div style={S.pillGroupLabel}>Removes barrier</div>
              <div style={S.tagWrap}>{resource.barriers.map((t) => <span key={t} style={S.pillBarrier}>{t}</span>)}</div>
            </div>
          )}
        </div>
      )}

      {resource.notes && <InfoBlock icon={Link2} title="Notes" text={resource.notes} />}

      {!isClient && (connected.length > 0 || referredBy.length > 0) && (
        <div style={{ marginTop: 18 }}>
          <div style={S.sectionLabel}>HOW THIS CONNECTS</div>
          {connected.map((r) => <ConnectionRow key={r.id} resource={r} direction="→ refers to" onClick={() => onJump(r.id)} />)}
          {referredBy.map((r) => <ConnectionRow key={r.id} resource={r} direction="← referred by" onClick={() => onJump(r.id)} />)}
        </div>
      )}

      {!isClient && resource.editedBy && (
        <div style={S.attribution}>Last edited by {resource.editedBy}{resource.editedDate ? ` on ${resource.editedDate}` : ""}</div>
      )}

      <div style={S.detailActions}>
        {!isClient && canEdit && <button style={S.editBtn} onClick={onEdit}><Edit3 size={14} /> Edit</button>}
        <button style={S.shareBtn} onClick={copyShare}><Copy size={14} /> Copy to text a client</button>
        {!isClient && canEdit && resource.status !== "closed" && (
          <button style={S.closeBtn} onClick={() => window.confirm(`Mark "${resource.name}" as closed? It stays in the list (unless hidden) for reference.`) && onClose()}>
            Mark closed
          </button>
        )}
        {!isClient && canEdit && (
          <button style={S.deleteBtn} onClick={() => window.confirm(`Permanently delete "${resource.name}"? This can't be undone — consider "Mark closed" instead.`) && onDelete()}><Trash2 size={14} /> Delete</button>
        )}
      </div>
    </div>
  );
}
