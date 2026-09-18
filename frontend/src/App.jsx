import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Week 1 foundation placeholder.
 *
 * This intentionally does not implement any product feature yet — it only
 * confirms that the frontend can reach the Django/DRF backend's health
 * endpoint, which is the pattern all future API calls will follow
 * (frontend -> Django/DRF -> Supabase PostgreSQL, never frontend -> DB
 * directly). Real screens are built starting Week 3/4 per the roadmap.
 */
function App() {
  const [backendStatus, setBackendStatus] = useState("checking...");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health/`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.status === "ok" ? "connected" : "unexpected response"))
      .catch(() => setBackendStatus("not reachable (start the Django server)"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">JnUVerse</h1>
        <p className="mt-2 text-slate-600">
          A Centralized Platform for University Clubs &amp; Student Activities
        </p>
        <p className="mt-6 text-sm text-slate-500">
          Week 1 — Project foundation established. Feature development begins
          in the weeks ahead per the 14-week roadmap.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Backend health check:{" "}
          <span className="font-mono text-slate-600">{backendStatus}</span>
        </p>
      </div>
    </div>
  );
}

export default App;
