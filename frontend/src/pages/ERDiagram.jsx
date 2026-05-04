import { useSchema } from "../context/SchemaContext";
import { useLocation } from "react-router-dom";
export default function ERDiagram() {
  // Normalize both .name/.table_name and .name/.column_name field shapes
    const location = useLocation();
    const fullPage = location.pathname === "/er-diagram";
    const { schema, isDark } = useSchema();
    const tables = (schema?.tables || []).map((t) => ({
    name: t.table_name || t.name || "?",
    columns: (t.columns || []).map((c) => ({
      name: c.column_name || c.name || "",
      type: c.data_type || c.type || "",
      isPK: !!(c.is_primary_key || c.primary_key),
      isFK: !!(c.is_foreign_key || c.foreign_key),
    })),
    foreignKeys: (t.foreign_keys || []).map((fk) => ({
      toTable: fk.references_table || fk.to_table || fk.referenced_table || "",
    })),
  }));

  if (!tables.length) return <p style={{ color: "#4b5563", fontSize: 12, padding: "12px 0" }}>No schema loaded.</p>;

  const CARD_W = 186;
  const ROW_H = 22;
  const HEADER_H = 32;
  const COL_GAP = 60;
  const ROW_GAP = 44;
  const COLS = 2;
  const OFFSET_X = 12;
  const OFFSET_Y = 12;

  const layouts = tables.map((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const height = HEADER_H + t.columns.length * ROW_H + 6;
    return {
      ...t,
      x: OFFSET_X + col * (CARD_W + COL_GAP),
      y: OFFSET_Y + row * (200 + ROW_GAP),
      w: CARD_W,
      h: height,
    };
  });

  const totalRows = Math.ceil(tables.length / COLS);
  const svgH = OFFSET_Y + totalRows * (200 + ROW_GAP) + 20;
  const svgW = OFFSET_X + COLS * (CARD_W + COL_GAP);

  // FK relationship lines
  const lines = [];
  layouts.forEach((src) => {
    (src.foreignKeys || []).forEach((fk) => {
      const tgt = layouts.find((t) => t.name === fk.toTable);
      if (!tgt) return;
      const x1 = src.x + src.w;
      const y1 = src.y + src.h / 2;
      const x2 = tgt.x;
      const y2 = tgt.y + tgt.h / 2;
      const mx = (x1 + x2) / 2;
      lines.push({ x1, y1, x2, y2, mx, my: (y1 + y2) / 2 });
    });
  });

  const c = isDark
    ? { cardBg: "#0b1425", border: "#1a3050", header: "#0e1e38", headerText: "#7dd3fc", colText: "#94a3b8", typeText: "#334155", pkColor: "#fbbf24", fkColor: "#60a5fa", lineColor: "#1d4ed8", lineLabelBg: "#060e1a", lineLabelText: "#3b82f6", rowDivider: "#111e30" }
    : { cardBg: "#ffffff", border: "#bfdbfe", header: "#dbeafe", headerText: "#1e40af", colText: "#374151", typeText: "#9ca3af", pkColor: "#d97706", fkColor: "#2563eb", lineColor: "#93c5fd", lineLabelBg: "#eff6ff", lineLabelText: "#2563eb", rowDivider: "#e0f2fe" };

  return (
     <div className={fullPage ? "er-fullpage" : "er-embedded"}>
     <button style={{border: `1px solid ${c.border}`,padding: "4px 8px",backgroundColor: c.cardBg,color: c.headerText,borderRadius: "4px"}} onClick={() => window.location.href = "/dashboard"}>← Back</button>
      <div
        id="diagram-container"
        className={fullPage ? "scale-75 origin-top mx-auto pt-4" : "scale-100"}
      >
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
      <defs>
        <marker id="er-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M1 1L9 5L1 9" fill="none" stroke={c.lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="er-crow" viewBox="0 0 14 14" refX="1" refY="7" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M7 2L1 7L7 12M12 2L6 7L12 12" fill="none" stroke={c.lineColor} strokeWidth="1.5" strokeLinecap="round" />
        </marker>
      </defs>

      {/* Relationship lines */}
      {lines.map((l, i) => (
        <g key={i}>
          <path
            d={`M${l.x1},${l.y1} C${l.mx},${l.y1} ${l.mx},${l.y2} ${l.x2},${l.y2}`}
            fill="none" stroke={c.lineColor} strokeWidth="1.5" strokeDasharray="4 3"
            markerEnd="url(#er-arrow)" markerStart="url(#er-crow)"
          />
          <rect x={l.mx - 13} y={l.my - 8} width="26" height="15" rx="4" fill={c.lineLabelBg} stroke={c.lineColor} strokeWidth="0.8" />
          <text x={l.mx} y={l.my + 4} textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace" fill={c.lineLabelText}>N:1</text>
        </g>
      ))}

      {/* Table cards */}
      {layouts.map((t) => (
        <g key={t.name}>
          {isDark && <rect x={t.x + 2} y={t.y + 2} width={t.w} height={t.h} rx="7" fill="#000" opacity="0.35" />}
          {/* Body */}
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="7" fill={c.cardBg} stroke={c.border} strokeWidth="1" />
          {/* Header */}
          <rect x={t.x} y={t.y} width={t.w} height={HEADER_H} rx="7" fill={c.header} />
          <rect x={t.x} y={t.y + HEADER_H - 6} width={t.w} height={6} fill={c.header} />
          {/* Table name */}
          <text x={t.x + 10} y={t.y + 21} fontSize="11" fontWeight="700" fontFamily="JetBrains Mono,monospace" fill={c.headerText}>
            {t.name.length > 17 ? t.name.slice(0, 16) + "…" : t.name}
          </text>
          {/* Column count */}
          <rect x={t.x + t.w - 24} y={t.y + 9} width="18" height="13" rx="6" fill={isDark ? "#1a3050" : "#bfdbfe"} />
          <text x={t.x + t.w - 15} y={t.y + 19} textAnchor="middle" fontSize="8" fontWeight="600" fontFamily="sans-serif" fill={c.headerText}>{t.columns.length}</text>
          {/* Divider */}
          <line x1={t.x} y1={t.y + HEADER_H} x2={t.x + t.w} y2={t.y + HEADER_H} stroke={c.border} strokeWidth="1" />
          {/* Columns */}
          {t.columns.map((col, ci) => {
            const ry = t.y + HEADER_H + ci * ROW_H + 3;
            return (
              <g key={col.name}>
                {(col.isPK || col.isFK) && (
                  <rect x={t.x + 1} y={ry} width={t.w - 2} height={ROW_H} rx="0"
                    fill={col.isPK ? (isDark ? "rgba(251,191,36,0.07)" : "rgba(251,191,36,0.1)") : (isDark ? "rgba(96,165,250,0.06)" : "rgba(96,165,250,0.08)")} />
                )}
                {col.isPK && <text x={t.x + 7} y={ry + 14} fontSize="9" fill={c.pkColor}>🔑</text>}
                {col.isFK && !col.isPK && <text x={t.x + 7} y={ry + 14} fontSize="9" fill={c.fkColor}>🔗</text>}
                <text
                  x={t.x + (col.isPK || col.isFK ? 20 : 8)}
                  y={ry + 14}
                  fontSize="10.5" fontFamily="JetBrains Mono,monospace"
                  fill={col.isPK ? c.pkColor : col.isFK ? c.fkColor : c.colText}
                  fontWeight={col.isPK ? "600" : "400"}
                >
                  {col.name.length > 15 ? col.name.slice(0, 14) + "…" : col.name}
                </text>
                {col.type && (
                  <text x={t.x + t.w - 6} y={ry + 14} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono,monospace" fill={c.typeText}>
                    {col.type.length > 9 ? col.type.slice(0, 8) + "…" : col.type}
                  </text>
                )}
                {ci < t.columns.length - 1 && (
                  <line x1={t.x + 5} y1={ry + ROW_H} x2={t.x + t.w - 5} y2={ry + ROW_H} stroke={c.rowDivider} strokeWidth="0.5" />
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
    </div>
    </div>
  );
}