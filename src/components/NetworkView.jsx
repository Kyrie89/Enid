import React from "react";
import { S } from "../styles";
import { CATEGORY_META } from "../lib/taxonomy";

export function NetworkView({ resources, onSelect, selectedId }) {
  const n = resources.length;
  if (n === 0) {
    return <div style={S.emptyState}>Nothing to show — adjust filters to see the referral network.</div>;
  }

  const size = 520;
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.min(cx, cy) - 46;
  const idToNode = {};
  resources.forEach((res, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    idToNode[res.id] = { ...res, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  const nodes = Object.values(idToNode);

  const connectedIds = new Set();
  const edges = [];
  nodes.forEach((node) => {
    (node.connections || []).forEach((cid) => {
      if (idToNode[cid]) {
        connectedIds.add(node.id);
        connectedIds.add(cid);
        edges.push({ from: node, to: idToNode[cid] });
      }
    });
  });

  const isolatedCount = nodes.length - connectedIds.size;

  return (
    <div style={{ padding: "16px 16px 24px" }}>
      <div style={S.networkHint}>
        {n > 26
          ? "Large view — narrow with search or a category filter for readable labels."
          : "Lines are referral connections. Dimmer dots aren't linked to anything yet — click one to add connections."}
        {isolatedCount > 0 && n <= 26 && ` (${isolatedCount} unconnected right now)`}
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "auto", maxHeight: 460 }} role="img" aria-label="Referral network graph">
        {edges.map((e, i) => (
          <line key={i} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke="#d8d4ca" strokeWidth={1.5} />
        ))}
        {nodes.map((node) => {
          const meta = CATEGORY_META[node.category];
          const isolated = !connectedIds.has(node.id);
          const isSelected = node.id === selectedId;
          return (
            <g
              key={node.id}
              onClick={() => onSelect(node.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); } }}
              role="button"
              tabIndex={0}
              aria-label={`${node.name}${isolated ? " — no connections yet" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 10 : 7}
                fill={meta.color}
                opacity={isolated ? 0.32 : 1}
                stroke={isSelected ? "#2f3437" : "none"}
                strokeWidth={2}
              />
              <title>{node.name}{isolated ? " — no connections yet" : ""}</title>
              {n <= 26 && (
                <text
                  x={node.x}
                  y={node.y - 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#5c6066"
                  fontFamily="'Helvetica Neue', Arial, sans-serif"
                >
                  {node.name.length > 18 ? node.name.slice(0, 17) + "…" : node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ ...S.tagWrap, marginTop: 12 }}>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <span key={key} style={{ ...S.pillIssue, background: meta.color + "1a", color: meta.color }}>{meta.label}</span>
        ))}
      </div>
    </div>
  );
}
