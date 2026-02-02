import React from "react";
import { api } from "../api/axios";

function Pill({ children }) {
  return (
    <span className="rounded-full border bg-white px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

function ListCard({ title, items, keyName, valueName, emptyText = "No data" }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <Pill>{items?.length || 0}</Pill>
      </div>

      {!items || items.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((x) => (
            <div
              key={x[keyName]}
              className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-800">
                {String(x[keyName])}
              </span>
              <span className="text-sm text-slate-700">{x[valueName]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [workspaceId, setWorkspaceId] = React.useState("");
  const [summary, setSummary] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    const id = workspaceId.trim();
    if (!id) return setError("workspaceId is required");
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/workspace/${id}/summary`);
      setSummary(data.summary);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load analytics");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Analytics
            </h1>
            <Pill>Workspace summary</Pill>
          </div>
          <p className="text-sm text-slate-600">
            Load analytics for a workspace by ID.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                workspaceId
              </label>
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <span className="text-slate-400">#</span>
                <input
                  className="w-full bg-transparent text-sm outline-none font-mono placeholder:text-slate-400"
                  placeholder="paste workspaceId"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") load();
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load"}
              </button>

              <button
                onClick={() => {
                  setWorkspaceId("");
                  setSummary(null);
                  setError("");
                }}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {summary && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Overdue tasks"
                value={summary.overdueCount ?? 0}
                subtitle="Tasks past due date"
              />
              <StatCard
                title="Statuses"
                value={(summary.byStatus || []).reduce(
                  (a, x) => a + (x.count || 0),
                  0,
                )}
                subtitle="Total counted by status"
              />
              <StatCard
                title="Priorities"
                value={(summary.byPriority || []).reduce(
                  (a, x) => a + (x.count || 0),
                  0,
                )}
                subtitle="Total counted by priority"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <ListCard
                  title="By status"
                  items={summary.byStatus || []}
                  keyName="status"
                  valueName="count"
                  emptyText="No status stats"
                />
              </div>

              <div className="lg:col-span-1">
                <ListCard
                  title="By priority"
                  items={summary.byPriority || []}
                  keyName="priority"
                  valueName="count"
                  emptyText="No priority stats"
                />
              </div>

              <div className="lg:col-span-1 rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Top assignees (done)
                  </h3>
                  <Pill>{(summary.topAssigneesDone || []).length}</Pill>
                </div>

                {(summary.topAssigneesDone || []).length === 0 ? (
                  <p className="text-sm text-slate-600">No data</p>
                ) : (
                  <div className="space-y-2">
                    {(summary.topAssigneesDone || []).map((x) => (
                      <div
                        key={x.userId}
                        className="flex items-start justify-between gap-3 rounded-xl border bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {x.name || x.userId}
                          </p>
                          {x.email ? (
                            <p className="truncate text-xs text-slate-600">
                              {x.email}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {x.doneCount}
                          </p>
                          <p className="text-xs text-slate-600">done</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
