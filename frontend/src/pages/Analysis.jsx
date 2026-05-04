import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import { queryAPI } from "../services/api";

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend
);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const CHART_COLORS = [
  "#378ADD", "#1D9E75", "#EF9F27", "#D85A30",
  "#7F77DD", "#D4537E", "#639922", "#888780",
];

const getSectionConfig = () => [
  {
    key: "insights",
    label: "Insights",
    emptyMsg: "No insights found.",
    accent: "#378ADD",
    bg: "var(--color-background-info)",
    textColor: "var(--color-text-info)",
  },
  {
    key: "trends",
    label: "Trends",
    emptyMsg: "No trends detected.",
    accent: "#1D9E75",
    bg: "var(--color-background-success)",
    textColor: "var(--color-text-success)",
  },
  {
    key: "anomalies",
    label: "Anomalies",
    emptyMsg: "No anomalies detected.",
    accent: "#EF9F27",
    bg: "var(--color-background-warning)",
    textColor: "var(--color-text-warning)",
  },
  {
    key: "recommendations",
    label: "Recommendations",
    emptyMsg: "No recommendations.",
    accent: "#D85A30",
    bg: "var(--color-background-danger)",
    textColor: "var(--color-text-danger)",
  },
];

const TABS = [
  { key: "insights", label: "Insights" },
  { key: "chart",    label: "Chart"    },
  { key: "report",   label: "Report"   },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("access_token");
}


// ─── shared sub-components ────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  return (
    <div style={{
      display: "flex",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      marginBottom: 20,
      gap: 0,
    }}>
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: "8px 18px",
            fontSize: 13,
            cursor: "pointer",
            border: "none",
            background: "none",
            color: active === t.key
              ? "var(--color-text-primary)"
              : "var(--color-text-secondary)",
            borderBottom: active === t.key
              ? "2px solid var(--color-text-primary)"
              : "2px solid transparent",
            fontWeight: active === t.key ? 600 : 400,
            marginBottom: -1,
            fontFamily: "inherit",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ label, value, bg, textColor, accent }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderLeft: `4px solid ${accent}`,
      borderRadius: 8,
      padding: "10px 12px",
    }}>
      <p style={{
        fontSize: 11,
        color: textColor,
        margin: "0 0 3px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 20,
        fontWeight: 700,
        margin: 0,
        color: "var(--color-text-primary)",
      }}>
        {value}
      </p>
    </div>
  );
}

function SectionCard({ config, items = [] }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 10,
      padding: "12px",
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: config.accent, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: "var(--color-text-primary)",
        }}>
          {config.label}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 11, fontWeight: 600,
          background: config.bg, color: config.textColor,
          borderRadius: 6, padding: "2px 8px",
        }}>
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p style={{
          fontSize: 12, color: "var(--color-text-tertiary)",
          fontStyle: "italic", margin: 0,
        }}>
          {config.emptyMsg}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={i} style={{
              display: "flex", gap: 10, padding: "8px 0",
              fontSize: 12.5, color: "var(--color-text-secondary)",
              borderBottom: i < items.length - 1
                ? "0.5px solid var(--color-border-tertiary)" : "none",
            }}>
              <span style={{ color: config.accent, fontWeight: "bold", flexShrink: 0 }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LoadingCard({ message }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "2.5rem",
      textAlign: "center",
    }}>
      <svg
        width="22" height="22" viewBox="0 0 22 22"
        style={{ animation: "spin 0.7s linear infinite", display: "inline-block", marginBottom: 10 }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="11" cy="11" r="9" fill="none"
          stroke="var(--color-border-secondary)" strokeWidth="2.5" />
        <path d="M11 2a9 9 0 0 1 9 9" fill="none"
          stroke="#378ADD" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
        {message}
      </p>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      background: "var(--color-background-danger)",
      border: "0.5px solid var(--color-border-danger)",
      borderRadius: 8, padding: "0.75rem 1rem",
      fontSize: 13, color: "var(--color-text-danger)",
    }}>
      {message}
    </div>
  );
}

// ─── chart tab ────────────────────────────────────────────────────────────────

function ChartView({ config }) {
  if (!config || !config.labels?.length || !config.datasets?.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
        No chart data available.
      </p>
    );
  }

  const ChartMap = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut };
  const Component = ChartMap[config.chart_type] || Bar;

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
    },
    scales: ["bar", "line"].includes(config.chart_type) ? {
      y: {
        beginAtZero: true,
        ticks: { color: "var(--color-text-secondary)" },
        grid:  { color: "var(--color-border-tertiary)" },
      },
      x: {
        ticks: { color: "var(--color-text-secondary)" },
        grid:  { display: false },
      },
    } : {},
  };

  // ONE chart per dataset
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {config.datasets.map((ds, i) => {
        const chartData = {
          labels: config.labels,
          datasets: [{
            label: ds.label,
            data: ds.data,
            backgroundColor: CHART_COLORS.map((c) => c + "CC"),
            borderColor: CHART_COLORS,
            borderWidth: 1.5,
            borderRadius: config.chart_type === "bar" ? 4 : 0,
          }],
        };

        return (
          <div
            key={i}
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 12, padding: "1.25rem",
            }}
          >
            <p style={{
              fontSize: 13, fontWeight: 600,
              color: "var(--color-text-primary)", marginBottom: 16,
            }}>
              {ds.label || config.title}
            </p>
            <Component data={chartData} options={options} />
          </div>
        );
      })}
    </div>
  );
}

// ─── report tab ───────────────────────────────────────────────────────────────

function ReportView({ report }) {
  if (!report) return (
    <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
      No report available.
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {report.title && (
        <h3 style={{
          fontSize: 17, fontWeight: 800,
          color: "var(--color-text-primary)", margin: 0,
        }}>
          {report.title}
        </h3>
      )}

      {/* Executive summary */}
      <div style={{
        background: "var(--color-background-info)",
        borderRadius: 10, padding: "14px 16px",
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.05em", color: "var(--color-text-info)",
          margin: "0 0 6px",
        }}>
          Executive summary
        </p>
        <p style={{
          fontSize: 14, lineHeight: 1.7,
          color: "var(--color-text-info)", margin: 0,
        }}>
          {report.executive_summary}
        </p>
      </div>

      {/* Key findings */}
      {report.key_findings?.length > 0 && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 10, padding: "12px",
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.05em", color: "var(--color-text-secondary)",
            margin: "0 0 10px",
          }}>
            Key findings
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {report.key_findings.map((f, i) => (
              <li key={i} style={{
                display: "flex", gap: 10, padding: "7px 0",
                fontSize: 12.5, color: "var(--color-text-secondary)",
                lineHeight: 1.6,
                borderBottom: i < report.key_findings.length - 1
                  ? "0.5px solid var(--color-border-tertiary)" : "none",
              }}>
                <span style={{ color: "#378ADD", fontWeight: "bold", flexShrink: 0 }}>•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      {report.sections?.map((section, i) => (
        <div key={i} style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 10, padding: "12px",
        }}>
          <p style={{
            fontSize: 13, fontWeight: 600,
            color: "var(--color-text-primary)", margin: "0 0 8px",
          }}>
            {section.heading}
          </p>
          <p style={{
            fontSize: 13, lineHeight: 1.7,
            color: "var(--color-text-secondary)", margin: 0,
          }}>
            {section.content}
          </p>
        </div>
      ))}

      {/* Conclusion */}
      {report.conclusion && (
        <div style={{
          borderLeft: "3px solid #378ADD",
          paddingLeft: 14, borderRadius: 0,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.05em", color: "var(--color-text-secondary)",
            margin: "0 0 4px",
          }}>
            Conclusion
          </p>
          <p style={{
            fontSize: 13, lineHeight: 1.7,
            color: "var(--color-text-secondary)", margin: 0,
          }}>
            {report.conclusion}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Analysis({ analysis, question, results, isDark }) {
  const sections = getSectionConfig();
  const [activeTab, setActiveTab] = useState("insights");

  const [chartData,     setChartData]     = useState(null);
  const [report,        setReport]        = useState(null);
  const [chartLoading,  setChartLoading]  = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [chartError,    setChartError]    = useState(null);
  const [reportError,   setReportError]   = useState(null);

  // Reset tab and lazy data when new analysis arrives
  useEffect(() => {
    setActiveTab("insights");
    setChartData(null);
    setReport(null);
    setChartError(null);
    setReportError(null);
  }, [analysis.question]);

  // Sync body background to theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.background = isDark ? "#0f172a" : "#f8fafc";
    document.body.style.background = isDark ? "#0f172a" : "#f8fafc";
    return () => {
      root.style.background = "";
      document.body.style.background = "";
    };
  }, [isDark]);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);

    if (tab === "chart" && !chartData && !chartLoading) {
      setChartLoading(true);
      setChartError(null);
      try {
        
        const data = await queryAPI.getChart(question, results);
        
        setChartData(data.data);
      } catch (e) {
        setChartError(e.message);
      } finally {
        setChartLoading(false);
      }
    }

    if (tab === "report" && !report && !reportLoading) {
      setReportLoading(true);
      setReportError(null);
      try {
        const data = await queryAPI.getReport(question, results);
        
        setReport(data.data);
      } catch (e) {
        setReportError(e.message);
      } finally {
        setReportLoading(false);
      }
    }
  };

  if (!analysis) {
    return (
      <div style={{
        minHeight: "100vh", padding: 20,
        background: "var(--color-background-tertiary)",
        color: "var(--color-text-primary)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Analysis</h2>
        <p style={{ color: "var(--color-text-secondary)" }}>Run a query to see analysis.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", width: "100%", padding: "20px",
      backgroundColor: "var(--color-background-tertiary)",
      color: "var(--color-text-primary)",
      fontFamily: "Inter, system-ui, sans-serif",
      boxSizing: "border-box",
    }}>
      <header style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>
          Analysis
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
          AI-powered insights and pattern detection.
        </p>
      </header>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {/* ── Insights tab ── */}
      {activeTab === "insights" && (
        <>
          {analysis.error && <ErrorBanner message={analysis.error} />}

          {/* Summary */}
          <div style={{
            marginBottom: 16,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12, padding: "16px",
          }}>
            <h4 style={{
              fontSize: 11, textTransform: "uppercase",
              letterSpacing: "0.05em", color: "var(--color-text-secondary)",
              margin: "0 0 8px",
            }}>
              Executive Summary
            </h4>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--color-text-primary)" }}>
              {analysis.summary || "No summary available."}
            </p>
          </div>

          {/* Metrics */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12, marginBottom: 20,
          }}>
            {sections.map((s) => (
              <MetricCard
                key={s.key}
                label={s.label}
                value={analysis[s.key]?.length ?? 0}
                bg={s.bg}
                accent={s.accent}
                textColor={s.textColor}
              />
            ))}
          </div>

          {/* Detail sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sections.map((config) => (
              <SectionCard
                key={config.key}
                config={config}
                items={analysis[config.key] ?? []}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Chart tab ── */}
      {activeTab === "chart" && (
        chartLoading ? <LoadingCard message="Generating chart…" /> :
        chartError   ? <ErrorBanner message={chartError} /> :
                       <ChartView config={chartData} />
      )}

      {/* ── Report tab ── */}
      {activeTab === "report" && (
        reportLoading ? <LoadingCard message="Generating report…" /> :
        reportError   ? <ErrorBanner message={reportError} /> :
                        <ReportView report={report} />
      )}
    </div>
  );
}