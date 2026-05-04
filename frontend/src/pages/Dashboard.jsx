import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { queryAPI, historyAPI } from "../services/api";
import hljs from "highlight.js";
import Table from "./Table";
import SchemaVisualization from "./SchemaVisualization";
import Analysis from "./Analysis";
import { Link, useInRouterContext } from "react-router-dom";
import { useSchema } from "../context/SchemaContext";
import AppLogo from "../components/AppLogo";
import { showAuthSuccessToast } from "../components/AuthToast";

// ─── Detect Google Sheets sidebar: running in an iframe with narrow viewport ───
function useIsSidebar() {
  const [isSidebar, setIsSidebar] = useState(false);

  useEffect(() => {
    const checkIsSidebar = () => {
      const inIframe = (() => {
        try { return window.self !== window.top; } 
        catch { return true; } 
      })();
      
      // Google Sheets sidebars are 300px. 
      // 350px is a safe threshold for "sidebar-like" layouts.
      const isNarrow = window.innerWidth <= 350;

      setIsSidebar(inIframe || isNarrow);
    };

    // Initial check
    checkIsSidebar();

    window.addEventListener("resize", checkIsSidebar);
    return () => window.removeEventListener("resize", checkIsSidebar);
  }, []);

  return isSidebar;
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  Send: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Star: ({ filled, size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Logout: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Menu: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  DB: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Spinner: ({ size = 14 }) => (
    <svg className="sq-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  Copy: ({ size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Plus: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ChevronRight: ({ open, size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Error: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Warning: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Schema: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Sun: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Stats: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  History: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    </svg>
  ),
  Settings: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  ),
};

// ─── Dark mode color palettes ─────────────────────────────────────────────────
// All readable foreground text is at least #a0b8d0 on dark backgrounds (~#06090f)
function makeTokens(isDark, compact = false) {
  return {
    bg: compact
      ? { app: isDark ? "#06090f" : "#f0f4ff", card: isDark ? "#0c1526" : "#ffffff", input: isDark ? "#0c1526" : "#f8faff", nav: isDark ? "#070d1a" : "#ffffff" }
      : { app: isDark ? "#081115" : "#f0f4ff", sidebar: isDark ? "#070d1a" : "#ffffff", header: isDark ? "#070d1a" : "#ffffff", card: isDark ? "#0c1526" : "#ffffff", input: isDark ? "#0c1526" : "#f8faff", schema: isDark ? "#080e1c" : "#f0f6ff" },
    border: isDark ? "#172640" : "#e2e8f0",
    txt: {
      primary:  isDark ? "#dce8f8" : "#1e293b",   // headings, labels, input text
      body:     isDark ? "#b0c8e4" : "#374151",   // explanation / paragraph text
      muted:    isDark ? "#7aa2c8" : "#64748b",   // secondary labels, nav inactive
      faint:    isDark ? "#3a5878" : "#94a3b8",   // timestamps, section labels
      link:     isDark ? "#5a9fd4" : "#475569",   // history item questions
      accent:   isDark ? "#60a5fa" : "#2563eb",   // schema table names, active states
      disabled: isDark ? "#2a4060" : "#94a3b8",   // disabled button text
    },
  };
}

// ─── Shared: SQL code block ────────────────────────────────────────────────────
function SqlBlock({ sql, isDark, compact = false }) {
  const [copied, setCopied] = useState(false);
  const { border, txt } = makeTokens(isDark, compact);
  const highlighted = sql
    ? hljs.highlightAuto(sql).value
    : '<span style="opacity:0.4;font-style:italic">No SQL generated yet</span>';

  return (
    <div style={{ borderRadius: compact ? 8 : 12, overflow: "hidden", border: `1px solid ${border}`, background: isDark ? "#070c18" : "#ffffff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: compact ? "5px 10px" : "8px 14px", borderBottom: `1px solid ${isDark ? "#0d1626" : "#f1f5f9"}`, background: isDark ? "#060b14" : "#f8fafc" }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace", color: txt.faint }}>SQL</span>
        <button onClick={() => { navigator.clipboard?.writeText(sql || ""); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", fontSize: 9, fontWeight: 500, color: txt.muted, transition: "all 0.15s" }}>
          <Icon.Copy size={10} />{copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{ padding: compact ? "10px" : "14px 16px", fontSize: compact ? 10.5 : 12.5, lineHeight: 1.65, fontFamily: "JetBrains Mono,monospace", overflowX: "auto", margin: 0, color: isDark ? "#c8d8f0" : "#1e293b" }}
        dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  );
}

// ─── Shared: Schema tree ───────────────────────────────────────────────────────
function SchemaTree({ schema, loading, isDark, compact = false }) {
  const [openTables, setOpenTables] = useState({});
  const { border, txt } = makeTokens(isDark, compact);
  const colBorder = isDark ? "#0f1929" : "#e0f2fe";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: txt.muted, fontSize: compact ? 11 : 12, padding: "8px 0" }}>
      <Icon.Spinner size={12} /> Loading…
    </div>
  );

  const tables = (schema?.tables || []).map((t) => ({
    name: t.table_name || t.name || "?",
    columns: (t.columns || []).map((c) => ({ name: c.column_name || c.name || "", type: c.data_type || c.type || "", isPK: !!(c.is_primary_key || c.primary_key), isFK: !!(c.is_foreign_key || c.foreign_key) })),
    fkCount: (t.foreign_keys || []).length,
  }));

  if (!tables.length) return <p style={{ color: txt.muted, fontSize: compact ? 11 : 12, padding: "8px 0" }}>No schema loaded.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6 }}>
      {tables.map((table) => (
        <div key={table.name} style={{ borderRadius: compact ? 6 : 8, border: `1px solid ${colBorder}`, overflow: "hidden", background: isDark ? "#060b14" : "#ffffff" }}>
          <button onClick={() => setOpenTables(p => ({ ...p, [table.name]: !p[table.name] }))}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: compact ? "6px 8px" : "8px 12px", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "rgba(30,58,92,0.2)" : "#eff6ff"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: txt.accent }}>
              <Icon.DB size={compact ? 11 : 13} />
              <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: compact ? 10 : 11.5, fontWeight: 600 }}>{table.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {table.fkCount > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 9, background: isDark ? "rgba(37,99,235,0.2)" : "#dbeafe", color: txt.accent, fontFamily: "monospace" }}>{table.fkCount} FK</span>}
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 9, background: isDark ? "#0f1929" : "#f1f5f9", color: txt.muted }}>{table.columns.length}</span>
              <Icon.ChevronRight open={openTables[table.name]} size={compact ? 10 : 11} />
            </div>
          </button>
          {openTables[table.name] && (
            <div style={{ borderTop: `1px solid ${colBorder}` }}>
              {table.columns.map((col) => (
                <div key={col.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: compact ? "4px 10px" : "5px 14px", background: col.isPK ? (isDark ? "rgba(251,191,36,0.06)" : "rgba(251,191,36,0.07)") : col.isFK ? (isDark ? "rgba(96,165,250,0.05)" : "rgba(96,165,250,0.06)") : "transparent", borderBottom: `1px solid ${isDark ? "rgba(15,25,41,0.8)" : "#e0f2fe"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 5 }}>
                    {col.isPK && <span style={{ fontSize: compact ? 9 : 10 }}>🔑</span>}
                    {col.isFK && !col.isPK && <span style={{ fontSize: compact ? 9 : 10 }}>🔗</span>}
                    <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: compact ? 10 : 11, color: col.isPK ? "#fbbf24" : col.isFK ? txt.accent : txt.body, fontWeight: col.isPK ? 600 : 400 }}>{col.name}</span>
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: compact ? 9 : 10, color: txt.faint, background: isDark ? "#080e1c" : "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{col.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Shared small components ───────────────────────────────────────────────────
function ErrorBox({ error, isDark, compact = false }) {
  return (
    <div style={{ display: "flex", gap: compact ? 8 : 12, alignItems: "flex-start", borderRadius: compact ? 8 : 12, padding: compact ? "10px 12px" : 16, background: isDark ? "rgba(127,29,29,0.2)" : "#fef2f2", border: `1px solid ${isDark ? "rgba(127,29,29,0.4)" : "#fca5a5"}`, color: isDark ? "#f87171" : "#b91c1c" }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}><Icon.Error size={compact ? 12 : 14} /></div>
      <div>
        <p style={{ fontSize: compact ? 10 : 11, fontWeight: 600, margin: "0 0 3px" }}>Query Error</p>
        <p style={{ fontSize: compact ? 10 : 11, fontFamily: "JetBrains Mono,monospace", margin: 0, lineHeight: 1.6 }}>{error}</p>
      </div>
    </div>
  );
}

function HistoryItem({ item, isDark, border, txt, onClick, onBookmark, fullWidth = false }) {
  return (
    <div onClick={onClick}
      style={{ padding: fullWidth ? "10px 16px" : "9px 12px", borderBottom: `1px solid ${border}`, cursor: "pointer", transition: "background 0.12s" }}
      onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.025)" : "#f8faff"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: fullWidth ? 12 : 11, color: txt.link, margin: 0, lineHeight: 1.45, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.natural_question}
        </p>
        <button onClick={onBookmark}
          style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, color: item.is_bookmarked ? "#fbbf24" : (isDark ? "#1e3a5f" : "#cbd5e1"), marginTop: 1 }}>
          <Icon.Star filled={item.is_bookmarked} size={fullWidth ? 13 : 11} />
        </button>
      </div>
      <span style={{ fontSize: 10, color: txt.faint, marginTop: 3, display: "block" }}>
        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

function SchemaViewToggle({ mode, setMode, isDark, border, txt }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 6, background: isDark ? "#0a1020" : "#e2e8f0", border: `1px solid ${border}` }}>
      {[{ k: "er", label: "ER" }, { k: "tree", label: "≡" }].map(({ k, label }) => (
        <button key={k} onClick={() => setMode(k)}
          style={{ padding: "2px 7px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, transition: "all 0.15s", background: mode === k ? (isDark ? "#1e3a5f" : "#ffffff") : "transparent", color: mode === k ? (isDark ? "#93c5fd" : "#1d4ed8") : txt.faint, boxShadow: mode === k && !isDark ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ConnectionToggle({ mode, onSwitch, isDark, border, txt }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 8, background: isDark ? "#070c18" : "#f1f5f9", border: `1px solid ${border}` }}>
      {[{ val: "default", label: "Demo DB" }, { val: "custom", label: "Custom" }].map(({ val, label }) => (
        <button key={val} onClick={() => onSwitch(val)}
          style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, transition: "all 0.15s", background: mode === val ? (isDark ? "rgba(37,99,235,0.35)" : "#dbeafe") : "transparent", color: mode === val ? (isDark ? "#93c5fd" : "#1d4ed8") : txt.muted }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function SchemaLinks({ inRouterContext, txt, compact = false }) {
  const sz = compact ? 11 : 14;
  const fs = compact ? 10 : 12;
  const mb = compact ? 8 : 8;
  const ArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={sz} height={sz}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5m0-4.5L10.5 13.5M6 6h4.5M6 6v12m0 0h12" />
    </svg>
  );
  const base = { display: "flex", alignItems: "center", gap: 4, fontSize: fs, color: txt.muted, marginBottom: mb, textDecoration: "none" };
  return (
    <>
      {inRouterContext ? <Link to="/er-diagram" style={base}>View full ER diagram <ArrowIcon /></Link> : <a href="/er-diagram" style={base}>View full ER diagram <ArrowIcon /></a>}
      {inRouterContext
        ? <Link to="/schema-statistics" target="_blank" style={{ ...base, marginBottom: compact ? 10 : 8 }}><Icon.Stats size={sz} /> Analysis Stats</Link>
        : <a href="/schema-statistics" target="_blank" style={{ ...base, marginBottom: compact ? 10 : 8 }}><Icon.Stats size={sz} /> Analysis Stats</a>}
    </>
  );
}

function GlobalStyles({ isDark, compact }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Figtree:wght@300;400;500;600;700&display=swap');
      *, body, button, input { font-family: 'Figtree', sans-serif; box-sizing: border-box; }
      pre, code, .font-mono { font-family: 'JetBrains Mono', monospace !important; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(${compact ? 5 : 10}px);} to { opacity:1; transform:translateY(0);} }
      @keyframes sq-spin { to { transform: rotate(360deg); } }
      .fade-up { animation: fadeUp 0.25s ease forwards; }
      .sq-spin { animation: sq-spin 1s linear infinite; }
      .animate-pulse { animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      .hljs-keyword,.hljs-selector-tag,.hljs-built_in { color:#7ec8f8 !important; font-weight:600; }
      .hljs-string,.hljs-attr { color:#86efac !important; }
      .hljs-number,.hljs-literal { color:#fca5a5 !important; }
      .hljs-comment { color:#4a6a8a !important; font-style:italic; }
      .hljs-function,.hljs-title { color:#c4b5fd !important; }
      ::-webkit-scrollbar { width:${compact ? 3 : 4}px; height:${compact ? 3 : 4}px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:${isDark ? "#1e3a5f" : "#cbd5e1"}; border-radius:99px; }
    `}</style>
  );
}

// ─── Shared state hook ─────────────────────────────────────────────────────────
const HISTORY_LIMIT = 10;

function useDashboardState() {
  const { schema, setSchema, setIsDark } = useSchema();
  const emptyResponse = () => ({ result: [], sql: "", explanation: "No explanation available", analysis: null, error: "" });

  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(emptyResponse);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [error, setError] = useState("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [connectionMode, setConnectionMode] = useState("default");
  const [connectionString, setConnectionString] = useState("");
  const [activeTab, setActiveTab] = useState("results");
  const [schemaViewMode, setSchemaViewMode] = useState("tree");
  const [theme, setTheme] = useState(() => localStorage.getItem("sq-theme") || "dark");
  const inputRef = useRef(null);
  const isDark = theme === "dark";

  useEffect(() => { localStorage.setItem("sq-theme", theme); }, [theme]);
  useEffect(() => { loadHistory(); fetchSchema(); }, []);

  const fetchSchema = async (connstr = null) => {
    setSchemaLoading(true);
    try { const r = await queryAPI.getSchema(connstr); setSchema(r.data); }
    catch (err) { console.error("Failed to fetch schema", err); }
    finally { setSchemaLoading(false); }
  };

  const loadHistory = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMoreHistory(true);
    try {
      const skip = isLoadMore ? history.length : 0;
      const r = await historyAPI.getHistory({ skip, limit: HISTORY_LIMIT });
      const newItems = r.data;
      if (isLoadMore) setHistory((prev) => [...prev, ...newItems]);
      else setHistory(newItems);
      setHasMoreHistory(newItems.length === HISTORY_LIMIT);
    } catch (err) { console.error("Failed to load history", err); }
    finally { if (isLoadMore) setLoadingMoreHistory(false); }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question.trim()) return;
    setLoading(true); setError(""); setResponse(emptyResponse()); setActiveTab("results");
    try {
      const connStr = connectionMode === "custom" ? connectionString : null;
      const res = await queryAPI.askQuestion(question, connStr);
      setResponse(res.data);
      if (connectionMode === "custom") fetchSchema(connStr);
      loadHistory();
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem("token");
        toast.error("Session expired. Please login again.");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
        return;
      }
      setError(err.response?.data?.detail || "Failed to get response");
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  const handleConnectionChange = (mode) => {
    setConnectionMode(mode);
    fetchSchema(mode === "custom" ? connectionString : null);
  };
  const handleConnectionStringBlur = () => {
    if (connectionMode === "custom" && connectionString.trim())
      fetchSchema(connectionString);
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    showAuthSuccessToast({
      title: "Logged out",
      message: "Your session ended securely.",
      options: { autoClose: 2200 },
    });
    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
  };
  const toggleBookmark = async (id) => {
    try {
      const res = await historyAPI.toggleBookmark(id);
      setHistory((prev) => prev.map((item) => item.id === id ? { ...item, is_bookmarked: res.data.bookmarked } : item));
    } catch (err) { console.error(err); }
  };

  const loadFromHistory = (item, cb) => {
    setQuestion(item.natural_question);
    setResponse({ sql: item.generated_sql, result: item.execution_result ? JSON.parse(item.execution_result) : [], error: item.error_message || "", explanation: item.explanation || "No explanation available", analysis: item.analysis || {} });
    setActiveTab("explanation");
    cb?.();
  };

  const toggleTheme = () => setTheme(t => { const next = t === "dark" ? "light" : "dark"; setIsDark(next === "dark"); return next; });
  const hasQueryOutput = response && (response.sql || response.explanation || response.result != null || (response.error && response.error.trim()));

  return {
    question, setQuestion, response, loading, history, hasMoreHistory, loadingMoreHistory,
    error, schema, schemaLoading, connectionMode, connectionString, setConnectionString,
    activeTab, setActiveTab, schemaViewMode, setSchemaViewMode, isDark, toggleTheme,
    inputRef, hasQueryOutput, handleSubmit, handleConnectionChange, handleConnectionStringBlur,
    handleLogout, toggleBookmark, loadFromHistory, loadHistory,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR UI — Google Sheets panel, narrow, tab-based
// ══════════════════════════════════════════════════════════════════════════════
function SidebarDashboard(state) {
  const { question, setQuestion, response, loading, history, hasMoreHistory, loadingMoreHistory, error, schema, schemaLoading, connectionMode, connectionString, setConnectionString, activeTab, setActiveTab, schemaViewMode, setSchemaViewMode, isDark, toggleTheme, inputRef, hasQueryOutput, handleSubmit, handleConnectionChange, handleConnectionStringBlur, handleLogout, toggleBookmark, loadFromHistory, loadHistory } = state;

  const [activePanel, setActivePanel] = useState("query");
  const [inputFocused, setInputFocused] = useState(false);
  const inRouterContext = useInRouterContext();
  const { bg, border, txt } = makeTokens(isDark, true);

  const suggestions = ["Show all employees with salary > 50000", "Top 5 products by revenue", "Count orders placed last month", "Departments with budget over 100k"];
  const navItems = [
    { id: "query",    label: "Query",    icon: <Icon.Send size={11} /> },
    { id: "history",  label: "History",  icon: <Icon.History size={11} /> },
    { id: "schema",   label: "Schema",   icon: <Icon.Schema size={11} /> },
    { id: "settings", label: "Settings", icon: <Icon.Settings size={11} /> },
  ];

  // Result tabs shared renderer
  const ResultTabs = () => (
    <>
      <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 7, border: `1px solid ${border}`, background: isDark ? "rgba(10,16,32,0.7)" : "#f1f5f9" }}>
        {[{ key: "explanation", label: "Explain" }, { key: "results", label: response.result?.length ? `Results (${response.result.length})` : "Results" }, { key: "Analysis", label: "Analysis" }].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ flex: 1, padding: "5px 4px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 500, transition: "all 0.15s", background: activeTab === tab.key ? (isDark ? "rgba(37,99,235,0.45)" : "#2563eb") : "transparent", color: activeTab === tab.key ? (isDark ? "#bfdbfe" : "#ffffff") : txt.muted }}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "explanation" && (
        <div className="fade-up" style={{ borderRadius: 8, border: `1px solid ${border}`, padding: 12, background: bg.card, fontSize: 11, lineHeight: 1.75, color: txt.body }}>
          <div dangerouslySetInnerHTML={{ __html: response.explanation || "No explanation available." }} />
        </div>
      )}
      {activeTab === "results" && (
        <div className="fade-up">
          {response.error?.trim() ? <ErrorBox error={response.error} isDark={isDark} compact /> : <Table response={response} isDark={isDark} />}
        </div>
      )}
      {activeTab === "Analysis" && <div className="fade-up"><Analysis analysis={response.analysis} question={question} results={response.result} isDark={isDark} /></div>}
    </>
  );

  return (
    <>
      <GlobalStyles isDark={isDark} compact />
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: bg.app, color: txt.primary, overflow: "hidden", minWidth: 240 }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: bg.nav, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: txt.primary }}>SQL Agent</span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={toggleTheme} style={{ background: "transparent", border: `1px solid ${border}`, cursor: "pointer", color: txt.muted, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" }}>
              {isDark ? <Icon.Sun size={12} /> : <Icon.Moon size={12} />}
            </button>
            <button onClick={() => { setQuestion(""); setActivePanel("query"); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{ background: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.3)", cursor: "pointer", color: isDark ? "#60a5fa" : "#2563eb", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Icon.Plus size={10} /> New
            </button>
          </div>
        </header>

        {/* Panels */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* ── QUERY ── */}
          {activePanel === "query" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 4px", display: "flex", flexDirection: "column", gap: 10 }} className="fade-up">
              {!schema?.tables?.length && !schemaLoading && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "7px 10px", borderRadius: 7, background: isDark ? "rgba(120,53,15,0.2)" : "#fffbeb", border: `1px solid ${isDark ? "rgba(120,53,15,0.4)" : "#fcd34d"}`, color: isDark ? "#fbbf24" : "#92400e", fontSize: 10, lineHeight: 1.5 }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}><Icon.Warning size={11} /></div>
                  No schema loaded. Open the Schema tab.
                </div>
              )}
              {!hasQueryOutput && !loading && !error && (
                <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 8px" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: isDark ? "linear-gradient(135deg,rgba(37,99,235,0.25),rgba(124,58,237,0.15))" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${isDark ? "rgba(37,99,235,0.3)" : "#bfdbfe"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#93c5fd" : "#2563eb"} strokeWidth="1.5" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: txt.primary, margin: "0 0 4px" }}>Ask your database</p>
                  <p style={{ fontSize: 10, color: txt.muted, maxWidth: 210, margin: "0 0 14px", lineHeight: 1.55 }}>Write plain English — get SQL, results & explanation.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => { setQuestion(s); inputRef.current?.focus(); }}
                        style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${border}`, fontSize: 10, background: bg.card, color: txt.muted, cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = txt.primary; e.currentTarget.style.borderColor = isDark ? "#2563eb" : "#93c5fd"; e.currentTarget.style.background = isDark ? "#0d1830" : "#eff6ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = txt.muted; e.currentTarget.style.borderColor = border; e.currentTarget.style.background = bg.card; }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {loading && (
                <div className="fade-up" style={{ borderRadius: 8, border: `1px solid ${border}`, padding: 14, background: bg.card }}>
                  <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 10, color: txt.muted, margin: 0, display: "flex", alignItems: "center", gap: 5 }}><Icon.Spinner size={11} /> Generating SQL…</p>
                    {[100, 75, 90, 60].map((w, i) => <div key={i} style={{ height: 9, borderRadius: 999, width: `${w}%`, background: isDark ? "#0f1929" : "#e2e8f0" }} />)}
                  </div>
                </div>
              )}
              {hasQueryOutput && !loading && (
                <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SqlBlock sql={response.sql} isDark={isDark} compact />
                  <ResultTabs />
                </div>
              )}
              {error && !loading && <ErrorBox error={error} isDark={isDark} compact />}
              <div style={{ height: 8 }} />
            </div>
          )}

          {/* ── HISTORY ── */}
          {activePanel === "history" && (
            <div style={{ flex: 1, overflowY: "auto" }} className="fade-up">
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: txt.faint, margin: 0, padding: "8px 12px 4px" }}>Recent Queries</p>
              {history.length === 0 && <p style={{ fontSize: 11, color: txt.muted, padding: "12px 12px" }}>No history yet.</p>}
              {history.map((item) => (
                <HistoryItem key={item.id} item={item} isDark={isDark} border={border} txt={txt}
                  onClick={() => loadFromHistory(item, () => setActivePanel("query"))}
                  onBookmark={(e) => { e.stopPropagation(); toggleBookmark(item.id); }} />
              ))}
              {hasMoreHistory && (
                <button onClick={() => loadHistory(true)} disabled={loadingMoreHistory}
                  style={{ width: "100%", padding: "10px", background: "transparent", border: "none", color: txt.primary, fontSize: 11, fontWeight: 500, cursor: loadingMoreHistory ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {loadingMoreHistory ? <><Icon.Spinner size={11} /> Loading...</> : "Load more"}
                </button>
              )}
            </div>
          )}

          {/* ── SCHEMA ── */}
          {activePanel === "schema" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 4px" }} className="fade-up">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: txt.faint }}>
                  {schemaLoading ? "Loading…" : schema?.tables?.length ? `${schema.tables.length} tables` : "No schema"}
                </span>
                <SchemaViewToggle mode={schemaViewMode} setMode={setSchemaViewMode} isDark={isDark} border={border} txt={txt} />
              </div>
              <SchemaLinks inRouterContext={inRouterContext} txt={txt} compact />
              {schemaViewMode === "er" ? <SchemaVisualization schema={schema} /> : <SchemaTree schema={schemaLoading ? null : schema} loading={schemaLoading} isDark={isDark} compact />}
              <div style={{ height: 8 }} />
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activePanel === "settings" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }} className="fade-up">
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: txt.faint, margin: "0 0 10px" }}>Settings</p>
              {/* Connection */}
              <div style={{ background: bg.card, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: txt.faint, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Database Connection</p>
                <ConnectionToggle mode={connectionMode} onSwitch={handleConnectionChange} isDark={isDark} border={border} txt={txt} />
                {connectionMode === "custom" && (
                  <input type="text" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} onBlur={handleConnectionStringBlur}
                    placeholder="mysql+pymysql://user:pass@host/db"
                    style={{ marginTop: 6, width: "100%", padding: "6px 8px", background: isDark ? "#070c18" : "#ffffff", border: `1px solid ${border}`, borderRadius: 6, fontSize: 10, fontFamily: "JetBrains Mono,monospace", color: txt.primary, outline: "none" }} />
                )}
              </div>
              {/* Appearance */}
              <div style={{ background: bg.card, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: txt.faint, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Appearance</p>
                <button onClick={toggleTheme}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: `1px solid ${border}`, background: "transparent", color: txt.muted, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                  {isDark ? <Icon.Sun size={12} /> : <Icon.Moon size={12} />}
                  {isDark ? "Switch to light mode" : "Switch to dark mode"}
                </button>
              </div>
              <button onClick={handleLogout}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fca5a5"}`, background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2", color: isDark ? "#f87171" : "#b91c1c", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                <Icon.Logout size={12} /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* Input bar — only on query panel */}
        {activePanel === "query" && (
          <div style={{ flexShrink: 0, padding: "8px 10px 10px", background: bg.app, borderTop: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 10, background: bg.input, border: `1px solid ${inputFocused ? (isDark ? "#1d4ed8" : "#3b82f6") : border}`, boxShadow: inputFocused ? (isDark ? "0 0 0 2px rgba(29,78,216,0.15)" : "0 0 0 2px rgba(59,130,246,0.1)") : "none", transition: "border-color 0.2s, box-shadow 0.2s" }}>
              <input ref={inputRef} type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                placeholder="Ask about your data…" disabled={loading}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11, color: txt.primary, padding: "3px 0", opacity: loading ? 0.5 : 1, minWidth: 0 }} />
              <button onClick={() => handleSubmit()} disabled={loading || !question.trim()}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: loading || !question.trim() ? (isDark ? "#0f1929" : "#e2e8f0") : "#2563eb", color: loading || !question.trim() ? (isDark ? txt.disabled : "#94a3b8") : "#ffffff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: loading || !question.trim() ? "not-allowed" : "pointer", transition: "all 0.15s", flexShrink: 0 }}
                onMouseEnter={(e) => { if (!loading && question.trim()) e.currentTarget.style.background = "#1d4ed8"; }}
                onMouseLeave={(e) => { if (!loading && question.trim()) e.currentTarget.style.background = "#2563eb"; }}>
                {loading ? <><Icon.Spinner size={10} /> …</> : <><Icon.Send size={10} /> Ask</>}
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 9, marginTop: 5, color: txt.faint }}>AI-generated — verify before acting.</p>
          </div>
        )}

        {/* Bottom nav */}
        <nav style={{ display: "flex", background: bg.nav, borderTop: `1px solid ${border}`, flexShrink: 0 }}>
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActivePanel(id)}
              style={{ flex: 1, background: activePanel === id ? (isDark ? "rgba(37,99,235,0.1)" : "rgba(37,99,235,0.05)") : "transparent", border: "none", borderTop: `2px solid ${activePanel === id ? "#2563eb" : "transparent"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "7px 0 5px", color: activePanel === id ? (isDark ? "#60a5fa" : "#2563eb") : txt.faint, transition: "all 0.15s" }}>
              {icon}
              <span style={{ fontSize: 9, fontWeight: activePanel === id ? 700 : 500 }}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL-WIDTH UI — original desktop layout, restored with fixed dark mode colors
// ══════════════════════════════════════════════════════════════════════════════
function FullDashboard(state) {
  const { question, setQuestion, response, loading, history, hasMoreHistory, loadingMoreHistory, error, schema, schemaLoading, connectionMode, connectionString, setConnectionString, activeTab, setActiveTab, schemaViewMode, setSchemaViewMode, isDark, toggleTheme, inputRef, hasQueryOutput, handleSubmit, handleConnectionChange, handleConnectionStringBlur, handleLogout, toggleBookmark, loadFromHistory, loadHistory } = state;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inRouterContext = useInRouterContext();
  const { bg, border, txt } = makeTokens(isDark, false);

  const suggestions = ["Show all employees with salary > 50000", "Top 5 products by revenue", "Count orders placed last month", "Departments with budget over 100k"];

  function SideBtn({ onClick, children }) {
    return (
      <button onClick={onClick}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: txt.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#f8faff"; e.currentTarget.style.color = txt.primary; e.currentTarget.style.borderColor = isDark ? "#1d4ed8" : "#93c5fd"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = txt.muted; e.currentTarget.style.borderColor = border; }}>
        {children}
      </button>
    );
  }

  return (
    <>
      <GlobalStyles isDark={isDark} compact={false} />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: bg.app, color: txt.primary, fontFamily: "'Figtree',sans-serif" }}>
        <div data-testid="schema-vis" style={{ display: "none" }} />
        {}
        <aside
          style={{
            width: sidebarOpen ? 272 : 0,
            minWidth: sidebarOpen ? 272 : 0,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
            transition: "width 0.3s ease, min-width 0.3s ease",
            background: bg.sidebar,
            borderRight: `1px solid ${border}`,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "18px 16px",
              borderBottom: `1px solid ${border}`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isDark ? "#0a1020" : "#f8fafc",
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                padding: 4,
              }}
            >
              <AppLogo size={28} alt="SQL Query Agent" />
            </div>
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: txt.primary,
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                SQL Query Agent
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: txt.faint,
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Query Interface
              </p>
            </div>
          </div>

          <div style={{ padding: "10px 10px 4px" }}>
            <SideBtn onClick={() => { setQuestion(""); inputRef.current?.focus(); }}><Icon.Plus size={12} /> New query</SideBtn>
          </div>

          {/* Schema accordion */}
          <div style={{ padding: "4px 10px 6px" }}>
            <button onClick={() => setSchemaOpen(p => !p)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: `1px solid ${schemaOpen ? (isDark ? "#1d4ed8" : "#93c5fd") : border}`, background: schemaOpen ? (isDark ? "rgba(29,78,216,0.12)" : "rgba(219,234,254,0.5)") : "transparent", color: schemaOpen ? (isDark ? "#60a5fa" : "#2563eb") : txt.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { if (!schemaOpen) { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#f8faff"; e.currentTarget.style.color = txt.primary; } }}
              onMouseLeave={(e) => { if (!schemaOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = txt.muted; } }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Icon.Schema size={14} /> Database Schema
                {schema?.tables?.length > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 9, background: isDark ? "#0f1929" : "#e0f2fe", color: isDark ? "#5a87be" : "#0284c7" }}>{schema.tables.length}</span>}
              </span>
              <Icon.ChevronRight open={schemaOpen} size={11} />
            </button>
          </div>

          <div style={{ overflow: "hidden", maxHeight: schemaOpen ? "400px" : "0px", transition: "max-height 0.3s ease", flexShrink: 0, margin: schemaOpen ? "0 10px 6px" : "0 10px", borderRadius: 10, border: schemaOpen ? `1px solid ${border}` : "none", background: bg.schema }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: txt.faint }}>
                {schemaLoading ? "Loading…" : schema?.tables?.length ? `${schema.tables.length} tables` : "No schema"}
              </span>
              <SchemaViewToggle mode={schemaViewMode} setMode={setSchemaViewMode} isDark={isDark} border={border} txt={txt} />
            </div>
            <div style={{ overflowY: "auto", maxHeight: 330, padding: 8 }}>
              <SchemaLinks inRouterContext={inRouterContext} txt={txt} />
              {schemaViewMode === "er" ? <SchemaVisualization schema={schema} /> : <SchemaTree schema={schemaLoading ? null : schema} loading={schemaLoading} isDark={isDark} />}
            </div>
          </div>

          <div style={{ padding: "4px 10px 6px" }}>
            {inRouterContext
              ? <Link to="/schema-statistics" target="_blank" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, color: txt.muted, fontSize: 12, fontWeight: 500, textDecoration: "none" }}><Icon.Stats size={14} /> Analysis Stats</Link>
              : <a href="/schema-statistics" target="_blank" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, color: txt.muted, fontSize: 12, fontWeight: 500, textDecoration: "none" }}><Icon.Stats size={14} /> Analysis Stats</a>}
          </div>

          <p style={{ padding: "4px 16px 6px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: txt.faint, margin: 0, flexShrink: 0 }}>Recent</p>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {history.length === 0 && <p style={{ fontSize: 12, color: txt.faint, padding: "8px 16px" }}>No history yet.</p>}
            {history.map((item) => (
              <HistoryItem key={item.id} item={item} isDark={isDark} border={border} txt={txt}
                onClick={() => loadFromHistory(item)}
                onBookmark={(e) => { e.stopPropagation(); toggleBookmark(item.id); }}
                fullWidth />
            ))}
            {hasMoreHistory && (
              <button onClick={() => loadHistory(true)} disabled={loadingMoreHistory}
                style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: txt.primary, fontSize: 12, fontWeight: 500, cursor: loadingMoreHistory ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loadingMoreHistory ? <><Icon.Spinner size={14} /> Loading...</> : "Load More"}
              </button>
            )}
          </div>

          <div style={{ padding: "8px 10px", borderTop: `1px solid ${border}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={toggleTheme}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: txt.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "#fcd34d" : "#2563eb"; e.currentTarget.style.background = isDark ? "rgba(251,191,36,0.06)" : "rgba(219,234,254,0.4)"; e.currentTarget.style.borderColor = isDark ? "rgba(251,191,36,0.2)" : "#93c5fd"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = txt.muted; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = border; }}>
              {isDark ? <Icon.Sun size={14} /> : <Icon.Moon size={14} />}
              {isDark ? "Switch to light mode" : "Switch to dark mode"}
            </button>
            <button onClick={handleLogout}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: txt.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.07)" : "rgba(254,226,226,0.5)"; e.currentTarget.style.borderColor = isDark ? "rgba(239,68,68,0.2)" : "#fca5a5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = txt.muted; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = border; }}>
              <Icon.Logout size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", background: bg.header, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(p => !p)} style={{ background: "transparent", border: "none", cursor: "pointer", color: txt.faint, padding: 6, borderRadius: 6, transition: "color 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = txt.primary} onMouseLeave={(e) => e.currentTarget.style.color = txt.faint}>
              <Icon.Menu />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: txt.primary }}>SQL Query Agent</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <ConnectionToggle mode={connectionMode} onSwitch={handleConnectionChange} isDark={isDark} border={border} txt={txt} />
              {connectionMode === "custom" && (
                <input type="text" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} onBlur={handleConnectionStringBlur}
                  placeholder="e.g. mysql+pymysql://user:pass@localhost:3306/dbname"
                  style={{ padding: "6px 12px", background: isDark ? "#0c1526" : "#ffffff", border: `1px solid ${border}`, borderRadius: 8, fontSize: 11, fontFamily: "JetBrains Mono,monospace", color: txt.primary, outline: "none", width: 280 }} />
              )}
            </div>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

              {!schema?.tables?.length && !schemaLoading && (
                <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 12, background: isDark ? "rgba(120,53,15,0.2)" : "#fffbeb", border: `1px solid ${isDark ? "rgba(120,53,15,0.4)" : "#fcd34d"}`, color: isDark ? "#fbbf24" : "#92400e", fontSize: 12 }}>
                  <Icon.Warning size={15} /> No schema loaded. Click "Database Schema" in the sidebar.
                </div>
              )}

              {!hasQueryOutput && !loading && !error && (
                <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "80px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: isDark ? "linear-gradient(135deg,rgba(37,99,235,0.3),rgba(124,58,237,0.2))" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${isDark ? "rgba(37,99,235,0.3)" : "#bfdbfe"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#93c5fd" : "#2563eb"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: txt.primary, margin: "0 0 8px" }}>Ask your database anything</h2>
                  <p style={{ fontSize: 13, color: txt.muted, maxWidth: 340, margin: "0 0 28px", lineHeight: 1.6 }}>Write in plain English — get SQL, results, and an explanation instantly.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => { setQuestion(s); inputRef.current?.focus(); }}
                        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${border}`, fontSize: 12, background: bg.card, color: txt.muted, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = txt.primary; e.currentTarget.style.borderColor = isDark ? "#1d4ed8" : "#93c5fd"; e.currentTarget.style.background = isDark ? "#0d1830" : "#eff6ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = txt.muted; e.currentTarget.style.borderColor = border; e.currentTarget.style.background = bg.card; }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="fade-up" style={{ borderRadius: 12, border: `1px solid ${border}`, padding: 20, background: bg.card }}>
                  <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 12, color: txt.muted, margin: 0 }}>Generating SQL…</p>
                    {[100, 80, 92, 65].map((w, i) => <div key={i} style={{ height: 12, borderRadius: 999, width: `${w}%`, background: isDark ? "#0f1929" : "#e2e8f0" }} />)}
                  </div>
                </div>
              )}

              {hasQueryOutput && !loading && (
                <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <SqlBlock sql={response.sql} isDark={isDark} />
                  <div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 12, padding: 4, borderRadius: 8, border: `1px solid ${border}`, background: isDark ? "rgba(10,16,32,0.7)" : "#f1f5f9", width: "fit-content" }}>
                      {[{ key: "explanation", label: "Explanation" }, { key: "results", label: response.result?.length ? `Results (${response.result.length})` : "Results" }, { key: "Analysis", label: "Analysis" }].map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                          style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s", background: activeTab === tab.key ? (isDark ? "rgba(37,99,235,0.45)" : "#2563eb") : "transparent", color: activeTab === tab.key ? (isDark ? "#bfdbfe" : "#ffffff") : txt.muted }}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    {activeTab === "explanation" && (
                      <div className="fade-up" style={{ borderRadius: 12, border: `1px solid ${border}`, padding: 20, background: bg.card, fontSize: 13, lineHeight: 1.75, color: txt.body }}>
                        <div dangerouslySetInnerHTML={{ __html: response.explanation || "No explanation available." }} />
                      </div>
                    )}
                    {activeTab === "results" && (
                      <div className="fade-up">
                        {response.error?.trim() ? <ErrorBox error={response.error} isDark={isDark} /> : <Table response={response} isDark={isDark} />}
                      </div>
                    )}
                    {activeTab === "Analysis" && <div className="fade-up"><Analysis analysis={response.analysis} question={question} results={response.result} isDark={isDark} /></div>}
                  </div>
                </div>
              )}

              {error && !loading && <ErrorBox error={error} isDark={isDark} />}
              <div style={{ height: 16 }} />
            </div>
          </div>

          {/* Input bar */}
          <div style={{ flexShrink: 0, padding: "12px 40px 20px", background: bg.app, borderTop: `1px solid ${border}` }}>
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: bg.input, border: `1px solid ${inputFocused ? (isDark ? "#1d4ed8" : "#3b82f6") : border}`, boxShadow: inputFocused ? (isDark ? "0 0 0 3px rgba(29,78,216,0.15)" : "0 0 0 3px rgba(59,130,246,0.12)") : "none", transition: "border-color 0.2s, box-shadow 0.2s" }}>
                <input ref={inputRef} type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                  placeholder="Ask a question about your data…" disabled={loading}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: txt.primary, padding: "4px 0", opacity: loading ? 0.5 : 1 }} />
                <button onClick={() => handleSubmit()} disabled={loading || !question.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: loading || !question.trim() ? (isDark ? "#0f1929" : "#e2e8f0") : "#2563eb", color: loading || !question.trim() ? (isDark ? txt.disabled : "#94a3b8") : "#ffffff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading || !question.trim() ? "not-allowed" : "pointer", transition: "all 0.15s", flexShrink: 0 }}
                  onMouseEnter={(e) => { if (!loading && question.trim()) e.currentTarget.style.background = "#1d4ed8"; }}
                  onMouseLeave={(e) => { if (!loading && question.trim()) e.currentTarget.style.background = "#2563eb"; }}>
                  {loading ? <><Icon.Spinner size={14} /> Generating</> : <><Icon.Send size={14} /> Ask</>}
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: 10, marginTop: 8, color: txt.faint }}>Results are AI-generated — always verify before acting on them.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — auto-detects context
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard() {
  const isSidebar = useIsSidebar();
  const state = useDashboardState();
  return isSidebar ? <SidebarDashboard {...state} /> : <FullDashboard {...state} />;
}

export default Dashboard;