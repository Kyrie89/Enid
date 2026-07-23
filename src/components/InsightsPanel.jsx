import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { S } from "../styles";
import { getVerificationInfo } from "../lib/utils";
import { supabase } from "../supabaseClient";

export function InsightsPanel({ onClose, resources }) {
  const [misses, setMisses] = useState(null);
  const [loading, setLoading] = useState(true);
  const closeBtnRef = useRef(null);

  useEffect(() => { closeBtnRef.current?.focus(); }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("search_misses")
        .select("term, hit_count")
        .order("hit_count", { ascending: false })
        .limit(15);
      setMisses(error ? [] : data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const staleCount = resources.filter((r) => {
    const v = getVerificationInfo(r);
    return v.level !== "fresh";
  }).length;
  const closedCount = resources.filter((r) => r.status === "closed").length;
  const isolatedCount = (() => {
    const ids = new Set(resources.map((r) => r.id));
    const connected = new Set();
    resources.forEach((r) => (r.connections || []).forEach((c) => { if (ids.has(c)) { connected.add(r.id); connected.add(c); } }));
    return resources.length - connected.size;
  })();

  const topMisses = misses || [];

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={S.formHeader}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Insights</h2>
          <button ref={closeBtnRef} style={S.iconBtn} onClick={onClose} aria-label="Close insights panel"><X size={16} /></button>
        </div>

        <div style={S.insightsGrid}>
          <div style={S.insightStat}>
            <div style={S.insightNum}>{resources.length}</div>
            <div style={S.insightLabel}>Total resources</div>
          </div>
          <div style={S.insightStat}>
            <div style={{ ...S.insightNum, color: staleCount > 0 ? "#a8632a" : "#2f6f5e" }}>{staleCount}</div>
            <div style={S.insightLabel}>Never / not recently verified</div>
          </div>
          <div style={S.insightStat}>
            <div style={{ ...S.insightNum, color: isolatedCount > 0 ? "#a8632a" : "#2f6f5e" }}>{isolatedCount}</div>
            <div style={S.insightLabel}>Not linked to any other resource</div>
          </div>
          <div style={S.insightStat}>
            <div style={S.insightNum}>{closedCount}</div>
            <div style={S.insightLabel}>Marked closed</div>
          </div>
        </div>

        <div style={S.sectionLabel}>SEARCHES THAT FOUND NOTHING</div>
        {loading && <div style={{ fontSize: 13, color: "#9aa0a6" }}>Loading…</div>}
        {!loading && topMisses.length === 0 && (
          <div style={{ fontSize: 13, color: "#9aa0a6", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
            No empty searches logged yet — this fills in as people use the search box.
          </div>
        )}
        {!loading && topMisses.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topMisses.map(({ term, hit_count }) => (
              <div key={term} style={S.missRow}>
                <span style={{ fontWeight: 600 }}>{term}</span>
                <span style={{ color: "#9aa0a6" }}>{hit_count}×</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "#c2c6cc", marginTop: 12, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
          This is exactly the kind of thing to bring back to the coalition — repeated empty searches point at real gaps in coverage.
        </div>
      </div>
    </div>
  );
}
