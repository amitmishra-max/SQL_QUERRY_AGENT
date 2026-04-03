import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { queryAPI, historyAPI } from "../services/api";
import "highlight.js/styles/github.css";
import SchemaVisualization from "./SchemaVisualization";
import Table from "./Table";

const emptyResponse = () => ({
  result: null,
  sql: "",
  explanation: "",
  error: "",
});

function Dashboard() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(emptyResponse);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [connectionMode, setConnectionMode] = useState("default");
  const [connectionString, setConnectionString] = useState("");

  useEffect(() => {
    loadHistory();
    fetchSchema();
  }, []);

  const fetchSchema = async (connstr = null) => {
    setSchemaLoading(true);
    try {
      const schema_response = await queryAPI.getSchema(connstr);
      setSchema(schema_response.data);
    } catch (err) {
      console.error("Failed to fetch schema", err);
    } finally {
      setSchemaLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await historyAPI.getHistory({ limit: 50 });
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setResponse(emptyResponse());

    try {
      const connStr = connectionMode === "custom" ? connectionString : null;
      const res = await queryAPI.askQuestion(question, connStr);
      setResponse(res.data);
      if (connectionMode === "custom") {
        fetchSchema(connStr);
      }
      loadHistory();
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem("token");
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }

      setError(err.response?.data?.detail || "Failed to get response");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionChange = (mode) => {
    setConnectionMode(mode);
    const connStr = mode === "custom" ? connectionString : null;
    fetchSchema(connStr);
  };

  const handleConnectionStringChange = (e) => {
    setConnectionString(e.target.value);
  };

  const handleConnectionStringBlur = () => {
    if (connectionMode === "custom" && connectionString.trim()) {
      fetchSchema(connectionString);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
    toast.success("Logged out successfully");
  };

  const toggleBookmark = async (id) => {
    try {
      await historyAPI.toggleBookmark(id);
      loadHistory();
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
    }
  };

  const hasQueryOutput =
    response &&
    (response.sql ||
      response.explanation ||
      response.result != null ||
      (response.error && response.error.trim()));

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Query History</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setQuestion(item.natural_question);
                setResponse({
                  sql: item.generated_sql,
                  result: item.execution_result
                    ? JSON.parse(item.execution_result)
                    : null,
                  explanation: "",
                  error: item.error_message || "",
                });
              }}
            >
              <p className="text-sm text-gray-700 truncate">
                {item.natural_question}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(item.id);
                  }}
                  className={`text-xs ${item.is_bookmarked ? "text-yellow-500" : "text-gray-400"}`}
                >
                  ★
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                SQL Query Agent
              </h1>
              <p className="text-sm text-gray-600">
                Ask questions in natural language
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">LLM Provider:</span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-medium">
                {connectionMode === "custom" ? "Custom DB" : "Demo DB"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Database Connection
                </h3>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="connectionMode"
                      value="default"
                      checked={connectionMode === "default"}
                      onChange={() => handleConnectionChange("default")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      Default Demo DB
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="connectionMode"
                      value="custom"
                      checked={connectionMode === "custom"}
                      onChange={() => handleConnectionChange("custom")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      Custom Connection String
                    </span>
                  </label>
                </div>
                {connectionMode === "custom" && (
                  <input
                    type="text"
                    value={connectionString}
                    onChange={handleConnectionStringChange}
                    onBlur={handleConnectionStringBlur}
                    placeholder="e.g. mysql+pymysql://user:pass@localhost:3306/dbname"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                )}
              </div>

              <form onSubmit={handleSubmit} className="mb-8">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question (e.g., 'Show all employees with salary > 50000')"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {loading ? "Generating..." : "Ask"}
                  </button>
                </div>
              </form>

              {!schema?.tables?.length ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ No schema loaded. The database might be empty or the
                    connection failed. Check the right panel.
                  </p>
                </div>
              ) : null}

              {hasQueryOutput ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      Explanation
                    </h3>
                    <code
                      className="block bg-gray-100 p-4 rounded mb-2 overflow-x-auto text-sm text-gray-800"
                      dangerouslySetInnerHTML={{
                        __html: response.explanation
                          ? response.explanation
                          : '<span class="text-gray-500">No explanation available</span>',
                      }}
                    />
                  </div>

                  {!response?.error?.trim() ? (
                    <Table response={response} />
                  ) : null}

                  {response?.error?.trim() ? (
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                      <h3 className="text-lg font-semibold mb-2 text-red-800">
                        Error
                      </h3>
                      <p className="text-red-600">{response.error}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto flex flex-col w-96 shrink-0">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                📊 Database Schema
              </h2>
              <p className="text-sm text-gray-500">
                {schemaLoading
                  ? "Loading schema..."
                  : "Visual representation of your database tables and relationships"}
              </p>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <SchemaVisualization schema={schemaLoading ? null : schema} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
