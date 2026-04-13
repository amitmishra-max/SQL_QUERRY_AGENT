import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { queryAPI, historyAPI } from "../services/api";
import hljs from "highlight.js";
import Table from "./Table";
import SchemaVisualization from "./SchemaVisualization";
import SchemaStatisticsCharts from "./SchemaStatisticsCharts";
import { Link, useInRouterContext } from "react-router-dom";
import { useSchema } from "../context/SchemaContext";

const Icon = {
  Send: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Star: ({ filled }) => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Logout: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Menu: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  DB: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Spinner: () => (
    <svg
      className="sq-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  Copy: () => (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Plus: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ChevronRight: ({ open }) => (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Error: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Warning: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Schema: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Sun: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
};


function SqlBlock({ sql, isDark = false }) {
  const [copied, setCopied] = useState(false);

  const highlighted = sql
    ? hljs.highlightAuto(sql).value
    : '<span class="italic opacity-60">No SQL generated yet</span>';

  const handleCopy = () => {
    navigator.clipboard?.writeText(sql || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

// THEME TOKENS
const theme = isDark
    ? {
        wrapper: "bg-[#070c18] border border-slate-800",
        topBar: "bg-[#060b14] border-slate-800",
        label: "text-slate-500",
        button:
          "border border-slate-700 text-slate-500 hover:text-slate-200 hover:border-slate-600",
        code: "text-slate-300",
      }
    : {
        wrapper: "bg-white border border-slate-300",
        topBar: "bg-slate-50 border-slate-200",
        label: "text-slate-600",
        button:
          "border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400",
        code: "text-slate-800",
      };

  return (
    <div className={`rounded-xl overflow-hidden ${theme.wrapper}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b ${theme.topBar}`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest font-mono ${theme.label}`}
        >
          SQL
        </span>

        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${theme.button}`}
        >
          <Icon.Copy />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <pre
        className={`p-4 text-[12.5px] leading-relaxed font-mono overflow-x-auto m-0 ${theme.code}`}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}




function SchemaTree({ schema, loading, isDark }) {
  const [openTables, setOpenTables] = useState({});
  const toggle = (name) => setOpenTables((p) => ({ ...p, [name]: !p[name] }));

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#4b5563",
          fontSize: 12,
          padding: "12px 0",
        }}
      >
        <Icon.Spinner /> Loading schema…
      </div>
    );

  const tables = (schema?.tables || []).map((t) => ({
    name: t.table_name || t.name || "?",
    columns: (t.columns || []).map((c) => ({
      name: c.column_name || c.name || "",
      type: c.data_type || c.type || "",
      isPK: !!(c.is_primary_key || c.primary_key),
      isFK: !!(c.is_foreign_key || c.foreign_key),
    })),
    fkCount: (t.foreign_keys || []).length,
  }));

  if (!tables.length)
    return (
      <p style={{ color: "#4b5563", fontSize: 12, padding: "12px 0" }}>
        No schema loaded.
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {tables.map((table) => (
        <div
          key={table.name}
          style={{
            borderRadius: 8,
            border: `1px solid ${isDark ? "#0f1929" : "#bfdbfe"}`,
            overflow: "hidden",
            background: isDark ? "#060b14" : "#ffffff",
          }}
        >
          <button
            onClick={() => toggle(table.name)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = isDark
                ? "rgba(30,58,92,0.2)"
                : "#eff6ff")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: isDark ? "#60a5fa" : "#2563eb",
              }}
            >
              <Icon.DB />
              <span
                style={{
                  fontFamily: "JetBrains Mono,monospace",
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {table.name}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {table.fkCount > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "1px 5px",
                    borderRadius: 9,
                    background: isDark ? "rgba(37,99,235,0.2)" : "#dbeafe",
                    color: isDark ? "#60a5fa" : "#1d4ed8",
                    fontFamily: "monospace",
                  }}
                >
                  {table.fkCount} FK
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 9,
                  background: isDark ? "#0f1929" : "#f1f5f9",
                  color: isDark ? "#334155" : "#64748b",
                }}
              >
                {table.columns.length}
              </span>
              <span style={{ color: isDark ? "#334155" : "#94a3b8" }}>
                <Icon.ChevronRight open={openTables[table.name]} />
              </span>
            </div>
          </button>

          {openTables[table.name] && (
            <div
              style={{
                borderTop: `1px solid ${isDark ? "#0f1929" : "#bfdbfe"}`,
              }}
            >
              {table.columns.map((col) => (
                <div
                  key={col.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 14px",
                    background: col.isPK
                      ? isDark
                        ? "rgba(251,191,36,0.06)"
                        : "rgba(251,191,36,0.07)"
                      : col.isFK
                        ? isDark
                          ? "rgba(96,165,250,0.05)"
                          : "rgba(96,165,250,0.06)"
                        : "transparent",
                    borderBottom: `1px solid ${isDark ? "rgba(15,25,41,0.8)" : "#e0f2fe"}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    {col.isPK && <span style={{ fontSize: 10 }}>🔑</span>}
                    {col.isFK && !col.isPK && (
                      <span style={{ fontSize: 10 }}>🔗</span>
                    )}
                    <span
                      style={{
                        fontFamily: "JetBrains Mono,monospace",
                        fontSize: 11,
                        color: col.isPK
                          ? "#fbbf24"
                          : col.isFK
                            ? isDark
                              ? "#60a5fa"
                              : "#2563eb"
                            : isDark
                              ? "#94a3b8"
                              : "#374151",
                        fontWeight: col.isPK ? 600 : 400,
                      }}
                    >
                      {col.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono,monospace",
                      fontSize: 10,
                      color: isDark ? "#1e3a5f" : "#9ca3af",
                      background: isDark ? "#080e1c" : "#f1f5f9",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {col.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


function Dashboard() {
  const [question, setQuestion] = useState("");
  const { schema, setSchema, setIsDark } = useSchema();
  const emptyResponse = () => ({
    result: [],
    sql: "",
    explanation: "No explanation available",
    error: "",
  });
  const [response, setResponse] = useState(emptyResponse);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [connectionMode, setConnectionMode] = useState("default");
  const [connectionString, setConnectionString] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("results");
  const [inputFocused, setInputFocused] = useState(false);
  const [schemaViewMode, setSchemaViewMode] = useState("tree"); // "er" | "tree"
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("sq-theme") || "dark",
  );

  const inputRef = useRef(null);
  const isDark = theme === "dark";
  const inRouterContext = useInRouterContext();

  useEffect(() => {
    localStorage.setItem("sq-theme", theme);
  }, [theme]);

  const hasQueryOutput =
    response &&
    (response.sql ||
      response.explanation ||
      response.result != null ||
      (response.error && response.error.trim()));

  useEffect(() => {
    loadHistory();
    fetchSchema();
  }, []);

  const fetchSchema = async (connstr = null) => {
    setSchemaLoading(true);
    try {
      const r = await queryAPI.getSchema(connstr);
      setSchema(r.data);
    } catch (err) {
      console.error("Failed to fetch schema", err);
    } finally {
      setSchemaLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const r = await historyAPI.getHistory({ limit: 50 });
      setHistory(r.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResponse(emptyResponse());
    setActiveTab("results");
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
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }
      setError(err.response?.data?.detail || "Failed to get response");
    } finally {
      setLoading(false);
    }
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
    toast.success("Logged out successfully");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
  };
  const toggleBookmark = async (id) => {
    try {
      await historyAPI.toggleBookmark(id);
      loadHistory();
    } catch (err) {
      console.error(err);
    }
  };
  const loadFromHistory = (item) => {
    setQuestion(item.natural_question);
    setResponse({
      sql: item.generated_sql,
      result: item.execution_result ? JSON.parse(item.execution_result) : [],
      error: item.error_message || "",
      explanation: item.explanation || "No explanation available",
    });
    setActiveTab("explanation");
    inputRef.current?.focus();
  };

  const suggestions = [
    "Show all employees with salary > 50000",
    "Top 5 products by revenue",
    "Count orders placed last month",
    "Departments with budget over 100k",
  ];

  // ── Colour tokens based on theme
  const bg = {
    app: isDark ? "#081115" : "#f0f4ff",
    sidebar: isDark ? "#040710" : "#ffffff",
    header: isDark ? "#040710" : "#ffffff",
    card: isDark ? "#070c18" : "#ffffff",
    input: isDark ? "#0a1020" : "#f8faff",
    schema: isDark ? "#080e1c" : "#f0f6ff",
  };
  const border = isDark ? "#142136" : "#e2e8f0";
  const borderCls = isDark ? "border-slate-900" : "border-slate-200";
  const txt = {
    primary: isDark ? "#fcfcfc" : "#1e293b",
    muted: isDark ? "#126eee" : "#64748b",
    faint: isDark ? "#c9ccd09e" : "#94a3b8",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Figtree:wght@300;400;500;600;700&display=swap');
        *, body, button, input { font-family: 'Figtree', sans-serif; }
        pre, code, .font-mono  { font-family: 'JetBrains Mono', monospace !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
        @keyframes sq-spin { to { transform: rotate(360deg); } }
        .fade-up  { animation: fadeUp 0.3s ease forwards; }
        .sq-spin  { animation: sq-spin 1s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .hljs-keyword,.hljs-selector-tag,.hljs-built_in { color:#93c5fd !important; font-weight:600; }
        .hljs-string,.hljs-attr  { color:#86efac !important; }
        .hljs-number,.hljs-literal { color:#fca5a5 !important; }
        .hljs-comment              { color:#4b5563 !important; font-style:italic; }
        .hljs-function,.hljs-title { color:#c4b5fd !important; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${isDark ? "#1e293b" : "#cbd5e1"}; border-radius:99px; }
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: bg.app,
          color: txt.primary,
          fontFamily: "'Figtree',sans-serif",
        }}
      >
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
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
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
                SQL Agent
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

          {/* New query button */}
          <div style={{ padding: "10px 10px 4px" }}>
            <SideBtn
              onClick={() => {
                setQuestion("");
                setResponse(emptyResponse());
                setError("");
                inputRef.current?.focus();
              }}
              isDark={isDark}
              border={border}
            >
              <Icon.Plus /> New query
            </SideBtn>
          </div>

          {}
          <div style={{ padding: "4px 10px 6px" }}>
            <button
              onClick={() => setSchemaOpen((p) => !p)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${schemaOpen ? (isDark ? "#1d4ed8" : "#93c5fd") : border}`,
                background: schemaOpen
                  ? isDark
                    ? "rgba(29,78,216,0.12)"
                    : "rgba(219,234,254,0.5)"
                  : "transparent",
                color: schemaOpen
                  ? isDark
                    ? "#60a5fa"
                    : "#2563eb"
                  : txt.muted,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!schemaOpen) {
                  e.currentTarget.style.background = isDark
                    ? "rgba(255,255,255,0.03)"
                    : "#f8faff";
                  e.currentTarget.style.color = txt.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!schemaOpen) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = txt.muted;
                }
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Icon.Schema />
                Database Schema
                {schema?.tables?.length > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 9,
                      background: isDark ? "#0f1929" : "#e0f2fe",
                      color: isDark ? "#334155" : "#0284c7",
                    }}
                  >
                    {schema.tables.length}
                  </span>
                )}
              </span>
              <Icon.ChevronRight open={schemaOpen} />
            </button>
          </div>

          {}
          <div
            style={{
              overflow: "hidden",
              maxHeight: schemaOpen ? "400px" : "0px",
              transition: "max-height 0.3s ease",
              flexShrink: 0,
              margin: schemaOpen ? "0 10px 6px" : "0 10px",
              borderRadius: 10,
              border: schemaOpen ? `1px solid ${border}` : "none",
              background: bg.schema,
            }}
          >
            {/* Schema header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: `1px solid ${border}`,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: txt.faint,
                }}
              >
                {schemaLoading
                  ? "Loading…"
                  : schema?.tables?.length
                    ? `${schema.tables.length} tables`
                    : "No schema"}
              </span>
              {/* ER / Tree toggle */}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  padding: 2,
                  borderRadius: 6,
                  background: isDark ? "#0a1020" : "#e2e8f0",
                  border: `1px solid ${border}`,
                }}
              >
                {[
                  { k: "er", label: "ER" },
                  { k: "tree", label: "≡" },
                ].map(({ k, label }) => (
                  <button
                    key={k}
                    onClick={() => setSchemaViewMode(k)}
                    style={{
                      padding: "2px 7px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 600,
                      transition: "all 0.15s",
                      background:
                        schemaViewMode === k
                          ? isDark
                            ? "#1e3a5f"
                            : "#ffffff"
                          : "transparent",
                      color:
                        schemaViewMode === k
                          ? isDark
                            ? "#93c5fd"
                            : "#1d4ed8"
                          : txt.faint,
                      boxShadow:
                        schemaViewMode === k && !isDark
                          ? "0 1px 3px rgba(0,0,0,0.1)"
                          : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Schema content */}
            <div
              style={{
                overflowY: "auto",
                overflowX: "auto",
                maxHeight: 330,
                padding: 8,
              }}
            >
              {inRouterContext ? (
                <Link
                  to="/er-diagram"
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 12,
                    color: txt.muted,
                    marginBottom: 8,
                  }}
                >
                  View full ER diagram
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H18m0 0v4.5m0-4.5L10.5 13.5M6 6h4.5M6 6v12m0 0h12"
                    />
                  </svg>
                </Link>
              ) : (
                <a
                  href="/er-diagram"
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 12,
                    color: txt.muted,
                    marginBottom: 8,
                  }}
                >
                  View full ER diagram
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H18m0 0v4.5m0-4.5L10.5 13.5M6 6h4.5M6 6v12m0 0h12"
                    />
                  </svg>
                </a>
              )}
              
              {schemaViewMode === "er" ? (
                <SchemaVisualization schema={schema} />
              ) : (
                <SchemaTree
                  schema={schemaLoading ? null : schema}
                  loading={schemaLoading}
                  isDark={isDark}
                />
              )}
            </div>
          </div>

          {/* Recent label */}
          <p
            style={{
              padding: "4px 16px 6px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: txt.faint,
              margin: 0,
              flexShrink: 0,
            }}
          >
            Recent
          </p>

          {/* History */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {history.length === 0 && (
              <p
                style={{ fontSize: 12, color: txt.faint, padding: "8px 16px" }}
              >
                No history yet.
              </p>
            )}
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => loadFromHistory(item)}
                style={{
                  padding: "10px 16px",
                  borderBottom: `1px solid ${border}`,
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = isDark
                    ? "rgba(255,255,255,0.02)"
                    : "#f8faff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: isDark ? "#036afa" : "#475569",
                      margin: 0,
                      lineHeight: 1.4,
                      flex: 1,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item.natural_question}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(item.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      color: item.is_bookmarked
                        ? "#fbbf24"
                        : isDark
                          ? "#1e293b"
                          : "#cbd5e1",
                      marginTop: 1,
                    }}
                  >
                    <Icon.Star filled={item.is_bookmarked} />
                  </button>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: txt.faint,
                    marginTop: 3,
                    display: "block",
                  }}
                >
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>

          {}
          <div
            style={{
              padding: "8px 10px",
              borderTop: `1px solid ${border}`,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Theme toggle */}
            <button
              onClick={() =>
                setTheme((t) => {
                  if (t === "dark") {
                    setIsDark(false);
                    return "light";
                  } else {
                    setIsDark(true);
                    return "dark";
                  }
                })
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: "transparent",
                color: txt.muted,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? "#fcd34d" : "#2563eb";
                e.currentTarget.style.background = isDark
                  ? "rgba(251,191,36,0.06)"
                  : "rgba(219,234,254,0.4)";
                e.currentTarget.style.borderColor = isDark
                  ? "rgba(251,191,36,0.2)"
                  : "#93c5fd";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = txt.muted;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = border;
              }}
            >
              {isDark ? <Icon.Sun /> : <Icon.Moon />}
              {isDark ? "Switch to light mode" : "Switch to dark mode"}
            </button>
            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: "transparent",
                color: txt.muted,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = isDark
                  ? "rgba(239,68,68,0.07)"
                  : "rgba(254,226,226,0.5)";
                e.currentTarget.style.borderColor = isDark
                  ? "rgba(239,68,68,0.2)"
                  : "#fca5a5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = txt.muted;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = border;
              }}
            >
              <Icon.Logout /> Sign out
            </button>
          </div>
        </aside>

        {}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Header */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              background: bg.header,
              borderBottom: `1px solid ${border}`,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: txt.faint,
                padding: 6,
                borderRadius: 6,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = txt.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = txt.faint)}
            >
              <Icon.Menu />
            </button>

            <span style={{ fontSize: 15, fontWeight: 700, color: txt.primary }}>
              SQL Query Agent
            </span>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Connection toggle */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: 4,
                  borderRadius: 8,
                  background: isDark ? "#070c18" : "#f1f5f9",
                  border: `1px solid ${border}`,
                }}
              >
                {[
                  { val: "default", label: "Demo DB" },
                  { val: "custom", label: "Custom" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => handleConnectionChange(val)}
                    aria-label={val === "custom" ? "Custom Connection String" : undefined}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 500,
                      transition: "all 0.15s",
                      background:
                        connectionMode === val
                          ? isDark
                            ? "rgba(37,99,235,0.35)"
                            : "#dbeafe"
                          : "transparent",
                      color:
                        connectionMode === val
                          ? isDark
                            ? "#93c5fd"
                            : "#1d4ed8"
                          : txt.muted,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {connectionMode === "custom" && (
                <input
                  type="text"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  onBlur={handleConnectionStringBlur}
                  placeholder="e.g. mysql+pymysql://user:pass@localhost:3306/dbname"
                  style={{
                    padding: "6px 12px",
                    background: isDark ? "#070c18" : "#ffffff",
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: "JetBrains Mono,monospace",
                    color: txt.primary,
                    outline: "none",
                    width: 280,
                  }}
                />
              )}
            </div>
          </header>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div
              style={{
                maxWidth: 740,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* No-schema warning */}
              {!schema?.tables?.length && !schemaLoading && (
                <div
                  className="fade-up"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 12,
                    background: isDark ? "rgba(120,53,15,0.2)" : "#fffbeb",
                    border: `1px solid ${isDark ? "rgba(120,53,15,0.4)" : "#fcd34d"}`,
                    color: isDark ? "#fbbf24" : "#92400e",
                    fontSize: 12,
                  }}
                >
                  <Icon.Warning /> No schema loaded. Click "Database Schema" in
                  the sidebar to inspect your tables.
                </div>
              )}

              {/* Welcome / empty state */}
              {!hasQueryOutput && !loading && !error && (
                <div
                  className="fade-up"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "80px 0",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      background: isDark
                        ? "linear-gradient(135deg,rgba(37,99,235,0.3),rgba(124,58,237,0.2))"
                        : "linear-gradient(135deg,#dbeafe,#ede9fe)",
                      border: `1px solid ${isDark ? "rgba(37,99,235,0.3)" : "#bfdbfe"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDark ? "#93c5fd" : "#2563eb"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                  </div>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: txt.primary,
                      margin: "0 0 8px",
                    }}
                  >
                    Ask your database anything
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: txt.muted,
                      maxWidth: 340,
                      margin: "0 0 28px",
                      lineHeight: 1.6,
                    }}
                  >
                    Write in plain English — get SQL, results, and an
                    explanation instantly.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      justifyContent: "center",
                    }}
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setQuestion(s);
                          inputRef.current?.focus();
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          fontSize: 12,
                          background: isDark ? "#070c18" : "#ffffff",
                          color: txt.muted,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = txt.primary;
                          e.currentTarget.style.borderColor = isDark
                            ? "#1d4ed8"
                            : "#93c5fd";
                          e.currentTarget.style.background = isDark
                            ? "#0a1020"
                            : "#eff6ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = txt.muted;
                          e.currentTarget.style.borderColor = border;
                          e.currentTarget.style.background = isDark
                            ? "#070c18"
                            : "#ffffff";
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div
                  className="fade-up"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${border}`,
                    padding: 20,
                    background: isDark ? "#070c18" : "#ffffff",
                  }}
                >
                  <div
                    className="animate-pulse"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <p style={{ fontSize: 12, color: txt.faint, margin: 0 }}>
                      Generating SQL…
                    </p>
                    {[100, 80, 92, 65].map((w, i) => (
                      <div
                        key={i}
                        style={{
                          height: 12,
                          borderRadius: 999,
                          width: `${w}%`,
                          background: isDark ? "#0f1929" : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Response */}
              {hasQueryOutput && !loading && (
                <div
                  className="fade-up"
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <SqlBlock sql={response.sql} isDark={isDark} />

                  {/* Tabs */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginBottom: 12,
                        padding: 4,
                        borderRadius: 8,
                        border: `1px solid ${border}`,
                        background: isDark ? "rgba(10,16,32,0.7)" : "#f1f5f9",
                        width: "fit-content",
                      }}
                    >
                      {[
                        { key: "explanation", label: "Explanation" },
                        {
                          key: "results",
                          label: response.result?.length
                            ? `Results (${response.result.length})`
                            : "Results",
                        },
                        { key: "statistics", label: "Analysis Stats" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 500,
                            transition: "all 0.15s",
                            background:
                              activeTab === tab.key
                                ? isDark
                                  ? "rgba(37,99,235,0.4)"
                                  : "#2563eb"
                                : "transparent",
                            color:
                              activeTab === tab.key
                                ? isDark
                                  ? "#bfdbfe"
                                  : "#ffffff"
                                : txt.muted,
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {activeTab === "explanation" && (
                      <div
                        className="fade-up"
                        style={{
                          borderRadius: 12,
                          border: `1px solid ${border}`,
                          padding: 20,
                          background: isDark ? "#070c18" : "#ffffff",
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: isDark ? "#d7d8d8" : "#161a21",
                        }}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html:
                              response.explanation ||
                              "No explanation available.",
                          }}
                        />
                      </div>
                    )}

                    {activeTab === "results" && (
                      <div className="fade-up">
                        {response.error?.trim() ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "flex-start",
                              borderRadius: 12,
                              padding: 16,
                              background: isDark
                                ? "rgba(127,29,29,0.2)"
                                : "#fef2f2",
                              border: `1px solid ${isDark ? "rgba(127,29,29,0.4)" : "#fca5a5"}`,
                              color: isDark ? "#f87171" : "#b91c1c",
                            }}
                          >
                            <span style={{ flexShrink: 0, marginTop: 1 }}>
                              <Icon.Error />
                            </span>
                            <div>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  margin: "0 0 4px",
                                }}
                              >
                                Query Error
                              </p>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontFamily: "JetBrains Mono,monospace",
                                  margin: 0,
                                  lineHeight: 1.6,
                                }}
                              >
                                {response.error}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Table response={response} isDark={isDark}/>
                        )}
                      </div>
                    )}

                    {activeTab === "statistics" && (
                      <div className="fade-up">
                        <SchemaStatisticsCharts 
                          connectionString={connectionMode === "custom" ? connectionString : null}
                          key={`stats-${connectionMode}-${connectionString}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error banner */}
              {error && !loading && (
                <div
                  className="fade-up"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 12,
                    background: isDark ? "rgba(127,29,29,0.2)" : "#fef2f2",
                    border: `1px solid ${isDark ? "rgba(127,29,29,0.4)" : "#fca5a5"}`,
                    color: isDark ? "#f87171" : "#b91c1c",
                    fontSize: 12,
                  }}
                >
                  <Icon.Error /> {error}
                </div>
              )}

              <div style={{ height: 16 }} />
            </div>
          </div>

          {}
          <div
            style={{
              flexShrink: 0,
              padding: "12px 40px 20px",
              background: bg.app,
              borderTop: `1px solid ${border}`,
            }}
          >
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: bg.input,
                    border: `1px solid ${inputFocused ? (isDark ? "#1d4ed8" : "#3b82f6") : border}`,
                    boxShadow: inputFocused
                      ? isDark
                        ? "0 0 0 3px rgba(29,78,216,0.15)"
                        : "0 0 0 3px rgba(59,130,246,0.12)"
                      : "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="Ask a question about your data…"
                    disabled={loading}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      color: txt.primary,
                      padding: "4px 0",
                      opacity: loading ? 0.4 : 1,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 16px",
                      background:
                        loading || !question.trim()
                          ? isDark
                            ? "#0f1929"
                            : "#e2e8f0"
                          : "#2563eb",
                      color:
                        loading || !question.trim()
                          ? isDark
                            ? "#334155"
                            : "#94a3b8"
                          : "#ffffff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor:
                        loading || !question.trim() ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && question.trim())
                        e.currentTarget.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && question.trim())
                        e.currentTarget.style.background = "#2563eb";
                    }}
                  >
                    {loading ? (
                      <>
                        <Icon.Spinner /> Generating
                      </>
                    ) : (
                      <>
                        <Icon.Send /> Ask
                      </>
                    )}
                  </button>
                </div>
              </form>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  marginTop: 8,
                  color: txt.faint,
                }}
              >
                Results are AI-generated — always verify before acting on them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


function SideBtn({ onClick, children, isDark, border }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: "transparent",
        color: isDark ? "#475569" : "#64748b",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark
          ? "rgba(255,255,255,0.03)"
          : "#f8faff";
        e.currentTarget.style.color = isDark ? "#e2e8f0" : "#1e293b";
        e.currentTarget.style.borderColor = isDark ? "#1d4ed8" : "#93c5fd";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = isDark ? "#475569" : "#64748b";
        e.currentTarget.style.borderColor = border;
      }}
    >
      {children}
    </button>
  );
}

export default Dashboard;


