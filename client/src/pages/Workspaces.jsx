import React from "react";
import { api } from "../api/axios";
import { Link } from "react-router-dom";

function Pill({ children }) {
  return (
    <span className="rounded-full border bg-white px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}

export default function Workspaces() {
  const [name, setName] = React.useState("");
  const [workspaces, setWorkspaces] = React.useState([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showJoin, setShowJoin] = React.useState(false);
  const [joinId, setJoinId] = React.useState("");
  const [joinMsg, setJoinMsg] = React.useState("");
  const [joining, setJoining] = React.useState(false);


  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const createWorkspace = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setError("");
    setCreating(true);
    try {
      await api.post("/workspaces", { name: trimmed });
      setName("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const joinWorkspace = async () => {
    const id = joinId.trim();
    if (!id) return;

    setError("");
    setJoining(true);
    try {
      await api.post(`/workspaces/${id}/join-requests`, { message: joinMsg });
      setShowJoin(false);
      setJoinId("");
      setJoinMsg("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Join request failed");
    } finally {
      setJoining(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Workspaces
          </h1>
          <p className="text-sm text-slate-600">
            Create a workspace to organize projects and collaborate with your
            team.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                New workspace name
              </label>
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <span className="text-slate-400">🏢</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="e.g. TaskFlow Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createWorkspace();
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createWorkspace}
                disabled={creating || !name.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create"}
              </button>

              <button
                onClick={load}
                disabled={loading}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => setShowJoin(true)}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Join workspace
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Your workspaces
            </h2>
            <Pill>{workspaces.length} total</Pill>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading workspaces...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
              No workspaces yet. Create your first workspace above.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {workspaces.map((w) => (
                <div
                  key={w._id}
                  className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {w.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        ID: <span className="font-mono">{w._id}</span>
                      </p>
                    </div>

                    <Link
                      to={`/workspace/${w._id}`}
                      className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Open →
                    </Link>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill>Workspace</Pill>
                    <Pill>Collaborative</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showJoin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-lg">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Join workspace
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Paste a workspace ID to send a join request.
                </p>
              </div>

              <label className="mb-1 block text-xs font-medium text-slate-600">
                Workspace ID
              </label>
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="e.g. 698077fac205417dbfeea605"
                className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") joinWorkspace();
                }}
              />

              <label className="mb-1 mt-3 block text-xs font-medium text-slate-600">
                Message (optional)
              </label>
              <textarea
                value={joinMsg}
                onChange={(e) => setJoinMsg(e.target.value)}
                placeholder="Hi, I want to join this workspace."
                className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-400"
                rows={3}
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowJoin(false)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={joinWorkspace}
                  disabled={joining || !joinId.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joining ? "Sending..." : "Send request"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Tip</p>
          <p className="mt-1">
            If you want to join as another account, copy the workspace ID and
            open:
            <span className="ml-2 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
              /workspace/:id
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
