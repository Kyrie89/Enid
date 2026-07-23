import React, { useEffect, useRef, useState } from "react";
import {
  MapPin, Phone, Globe, Clock, Users, AlertTriangle, ShieldCheck, Link2,
  Edit3, Trash2, Copy, Navigation, X, Printer, ArrowRight,
} from "lucide-react";
import { S } from "../styles";
import { CATEGORY_META, DAYS, DAY_SHORT, CLIENT_TAG_LABELS } from "../lib/taxonomy";
import { getVerificationInfo } from "../lib/utils";
import { supabase } from "../supabaseClient";
import { Field, InfoBlock, ConnectionRow } from "./shared";

function formatAgeRange(min, max) {
  if (min != null && max != null) return `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  return `Ages up to ${max}`;
}

export function DetailView({ resource, resources, onEdit, onDelete, onClose, onJump, audienceMode, showToast, canEdit, onPrint, outOfFilterScope, onClearFilters }) {
  const [confirmAction, setConfirmAction] = useState(null); // null | "close" | "delete"
  const [accuracyVote, setAccuracyVote] = useState(null); // null | "yes" | "no"
  const confirmCancelRef = useRef(null);

  useEffect(() => { setAccuracyVote(null); }, [resource.id]);

  const submitAccuracyVote = async (isAccurate) => {
    setAccuracyVote(isAccurate ? "yes" : "no");
    await supabase.from("accuracy_reports").insert({
      resource_id: resource.id, is_accurate: isAccurate, source: audienceMode,
    });
  };
  const meta = CATEGORY_META[resource.category];
  const Icon = meta.icon;
  const isClient = audienceMode === "client";
  const connected = resources.filter((r) => resource.connections.includes(r.id));
  const referredBy = resources.filter((r) => r.connections.includes(resource.id) && !resource.connections.includes(r.id));
  const siblingPrograms = resource.parentOrg
    ? resources.filter((r) => r.id !== resource.id && r.parentOrg?.trim().toLowerCase() === resource.parentOrg.trim().toLowerCase())
    : [];

  // "Confidential location" is a real safety flag (DV shelters, etc.) — the address and
  // a Directions deep-link stay hidden from the client-facing view regardless of print/share.
  const isConfidential = resource.barriers?.includes("Confidential location");
  const showAddress = resource.address && !(isClient && isConfidential);
  const directionsUrl = showAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`
    : null;

  useEffect(() => {
    if (!confirmAction) return;
    const onKey = (e) => { if (e.key === "Escape") setConfirmAction(null); };
    window.addEventListener("keydown", onKey);
    confirmCancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmAction]);

  const shareText = () => {
    const lines = [resource.name];
    if (resource.subcategory) lines.push(resource.subcategory);
    if (showAddress) lines.push(resource.address);
    if (resource.phone) lines.push(resource.phone);
    if (resource.website) lines.push(resource.website);
    if (resource.schedule?.length) {
      lines.push("Hours: " + resource.schedule.map((s) => `${DAY_SHORT[s.day]} ${s.time}`).join(", "));
    }
    if (resource.nextStep) lines.push("Next step: " + resource.nextStep);
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: meta.color, letterSpacing: 0.3 }}>{meta.label.toUpperCase()}</div>
            {resource.isStatewide && (
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, color: "#4a5a8a", background: "#4a5a8a14", borderRadius: 10, padding: "2px 8px" }}>
                REGIONAL / NATIONAL
              </span>
            )}
            {resource.isCountywide && (
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, color: "#4a5a8a", background: "#4a5a8a14", borderRadius: 10, padding: "2px 8px" }}>
                COUNTYWIDE
              </span>
            )}
          </div>
          <h2 style={{ ...S.detailName, ...(isClient ? { fontSize: 24 } : {}) }}>{resource.name}</h2>
          <div style={S.detailSubtitle}>{resource.subcategory}</div>
          {resource.parentOrg && <div style={S.detailSubtitle}>Part of {resource.parentOrg}</div>}
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

      {outOfFilterScope && (
        <div className="no-print" style={{ ...S.warnBanner, background: "#eef1f7", color: "#4a5a8a" }}>
          <AlertTriangle size={14} />
          <span>This resource no longer matches your current search or filters.</span>
          {onClearFilters && (
            <button type="button" onClick={onClearFilters} style={{ background: "transparent", border: "none", padding: 0, color: "inherit", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontSize: "inherit" }}>
              Clear filters
            </button>
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
            {v.label} — double-check hours, phone, and insurance before referring someone here.
          </div>
        );
      })()}

      {/* What it provides */}
      {resource.notes && <InfoBlock icon={Link2} title="What this provides" text={resource.notes} />}
      {resource.issues?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={S.pillGroupLabel}>Addresses</div>
          <div style={S.tagWrap}>{resource.issues.map((t) => <span key={t} style={S.pillIssue}>{isClient ? (CLIENT_TAG_LABELS[t] || t) : t}</span>)}</div>
        </div>
      )}

      {/* Who qualifies */}
      {resource.populations && <InfoBlock icon={Users} title={isClient ? "Who can use this service" : "Population served"} text={resource.populations} />}
      {(resource.ageMin != null || resource.ageMax != null) && (
        <InfoBlock icon={Users} title="Age range served" text={formatAgeRange(resource.ageMin, resource.ageMax)} />
      )}

      {/* Cost */}
      {resource.insurance && <InfoBlock icon={ShieldCheck} title="Cost and insurance" text={resource.insurance} />}
      {resource.barriers?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={S.pillGroupLabel}>{isClient ? "Important access needs" : "Removes barrier"}</div>
          <div style={S.tagWrap}>{resource.barriers.map((t) => <span key={t} style={S.pillBarrier}>{isClient ? (CLIENT_TAG_LABELS[t] || t) : t}</span>)}</div>
        </div>
      )}

      {/* When */}
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

      {/* How to start */}
      {resource.nextStep && <InfoBlock icon={ArrowRight} title="How to get started" text={resource.nextStep} tone="highlight" />}

      {/* Eligibility limits */}
      {resource.exclusions && <InfoBlock icon={AlertTriangle} title={isClient ? "Reasons someone may not qualify" : "Won't work for"} text={resource.exclusions} tone="warn" />}

      {/* Contact */}
      <div style={S.fieldGrid}>
        {showAddress && <Field icon={MapPin} label="Address" value={resource.address} href={!isClient ? directionsUrl : null} external={!isClient} />}
        {isClient && isConfidential && resource.address && (
          <div style={S.fieldRow}>
            <ShieldCheck size={14} color="#8a9099" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 14, color: "#3c4146" }}>Address is confidential for safety — call for details.</div>
          </div>
        )}
        {!isClient && resource.phone && <Field icon={Phone} label="Phone" value={resource.phone} href={`tel:${resource.phone.replace(/[^0-9+]/g, "")}`} />}
        {resource.website && <Field icon={Globe} label="Website" value={resource.website.replace(/^https?:\/\//, "")} href={resource.website} external />}
      </div>

      {resource.locations?.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 6 }}>
          <div style={S.infoBlockTitle}><MapPin size={13} /> Other locations</div>
          {resource.locations.map((l) => {
            const showLocAddress = l.address && !(isClient && isConfidential);
            const locDirections = showLocAddress
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address)}`
              : null;
            return (
              <div key={l.id} style={{ fontSize: 13.5, color: "#3c4146", marginBottom: 6, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>{l.label}</span>
                {" — "}
                {!showLocAddress ? (
                  "confidential — call for details"
                ) : locDirections ? (
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

      {siblingPrograms.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={S.sectionLabel}>OTHER PROGRAMS FROM {resource.parentOrg.toUpperCase()}</div>
          {siblingPrograms.map((r) => (
            <ConnectionRow key={r.id} resource={r} direction={r.subcategory || CATEGORY_META[r.category]?.label || ""} onClick={() => onJump(r.id)} />
          ))}
        </div>
      )}

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

      <div className="no-print" style={{ marginTop: 16, padding: "10px 12px", background: "#f8f7f3", borderRadius: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        {accuracyVote ? (
          <div style={{ fontSize: 13, color: "#2f6f5e", fontWeight: 600 }}>
            {accuracyVote === "yes" ? "Thanks for confirming!" : "Thanks — we'll get this checked."}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#5c6066", fontWeight: 600 }}>Is this information still accurate?</span>
            <button type="button" onClick={() => submitAccuracyVote(true)} style={{ ...S.catPick, borderColor: "#2f6f5e", color: "#2f6f5e", background: "#fff" }}>Yes</button>
            <button type="button" onClick={() => submitAccuracyVote(false)} style={{ ...S.catPick, borderColor: "#b3413a", color: "#b3413a", background: "#fff" }}>No</button>
          </div>
        )}
      </div>

      <div style={S.detailActions} className="no-print">
        {!isClient && canEdit && <button style={S.editBtn} onClick={onEdit}><Edit3 size={14} /> Edit</button>}
        <button style={S.shareBtn} onClick={copyShare}><Copy size={14} /> Copy to text a client</button>
        {!isClient && <button style={S.shareBtn} onClick={onPrint}><Printer size={14} /> Print this resource</button>}
        {!isClient && canEdit && resource.status !== "closed" && (
          <button style={S.closeBtn} onClick={() => setConfirmAction("close")}>
            Mark closed
          </button>
        )}
        {!isClient && canEdit && (
          <button style={S.deleteBtn} onClick={() => setConfirmAction("delete")}><Trash2 size={14} /> Delete</button>
        )}
      </div>

      {confirmAction && (
        <div className="no-print" style={S.modalOverlay} onClick={() => setConfirmAction(null)}>
          <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.formHeader}>
              <h2 style={{ margin: 0, fontSize: 17 }}>
                {confirmAction === "delete" ? "Delete this resource?" : "Mark this resource closed?"}
              </h2>
              <button style={S.iconBtn} onClick={() => setConfirmAction(null)} aria-label="Cancel"><X size={16} /></button>
            </div>
            <div style={{ fontSize: 13.5, color: "#3c4146", fontFamily: "'Helvetica Neue', Arial, sans-serif", lineHeight: 1.5, marginBottom: 18 }}>
              {confirmAction === "delete"
                ? `Permanently delete "${resource.name}"? This can't be undone — consider "Mark closed" instead.`
                : `Mark "${resource.name}" as closed? It stays in the list (unless hidden) for reference.`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={confirmAction === "delete" ? S.deleteBtn : S.closeBtn}
                onClick={() => { const action = confirmAction; setConfirmAction(null); if (action === "delete") onDelete(); else onClose(); }}
              >
                {confirmAction === "delete" ? "Delete" : "Mark closed"}
              </button>
              <button ref={confirmCancelRef} style={S.cancelBtn} onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
