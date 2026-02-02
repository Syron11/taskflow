import React from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/axios";

function Pill({ children }) {
  return (
    <span className="rounded-full border bg-white px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}

function Alert({ type = "info", children }) {
  const styles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export default function WorkspaceJoin() {
  const { id: workspaceId } = useParams();

  const [projects, setProjects] = React.useState([]);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [joinRequests, setJoinRequests] = React.useState([]);
  const [jrLoading, setJrLoading] = React.useState(false);


  const loadProjects = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { data } = await api.get(`/projects?workspaceId=${workspaceId}`);
      setProjects(data.projects || []);
      setInfo("Projects loaded.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadProjects();
  }, [workspaceId]);

  const createProject = async () => {
    setError("");
    setInfo("");
    if (!name.trim()) return setError("Project name is required");

    setCreating(true);
    try {
      const { data } = await api.post("/projects", {
        workspaceId,
        name: name.trim(),
        description: description.trim(),
      });
      setInfo(`Created project: ${data?.project?._id || "success"}`);
      setName("");
      setDescription("");
      await loadProjects();
    } catch (err) {
      setError(err?.response?.data?.message || "Create failed (owner only)");
    } finally {
      setCreating(false);
    }
  };

  const rename = async (projectId) => {
    const newName = prompt("New project name:");
    if (!newName) return;
    try {
      await api.patch(`/projects/${projectId}`, { name: newName });
      await loadProjects();
    } catch (err) {
      alert(err?.response?.data?.message || "Rename failed");
    }
  };

  const remove = async (projectId) => {
    if (!confirm("Delete project?")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      await loadProjects();
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed");
    }
  };

  const joinWorkspace = async () => {
    setError("");
    setInfo("");
    setJoining(true);
    try {
      await api.post(`/workspaces/${workspaceId}/join-requests`, {
        message: "",
      });
      setInfo("Join request sent. Waiting for owner approval.");
    } catch (err) {
      setError(err?.response?.data?.message || "Join request failed");
    } finally {
      setJoining(false);
    }
  };

  const loadJoinRequests = async () => {
    setError("");
    setInfo("");
    setJrLoading(true);
    try {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/join-requests?status=pending`,
      );
      setJoinRequests(data.joinRequests || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load join requests");
    } finally {
      setJrLoading(false);
    }
  };

  const approveRequest = async (requestId) => {
    setError("");
    setInfo("");
    try {
      await api.patch(
        `/workspaces/${workspaceId}/join-requests/${requestId}/approve`,
      );
      setInfo("Request approved.");
      await loadJoinRequests();
    } catch (err) {
      setError(err?.response?.data?.message || "Approve failed");
    }
  };

  const rejectRequest = async (requestId) => {
    setError("");
    setInfo("");
    try {
      await api.patch(
        `/workspaces/${workspaceId}/join-requests/${requestId}/reject`,
      );
      setInfo("Request rejected.");
      await loadJoinRequests();
    } catch (err) {
      setError(err?.response?.data?.message || "Reject failed");
    }
  };



  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Workspace
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                ID: <span className="font-mono">{workspaceId}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadProjects}
                disabled={loading}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={loadJoinRequests}
                disabled={jrLoading}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {jrLoading ? "Loading..." : "Requests"}
              </button>

              <button
                onClick={joinWorkspace}
                disabled={joining}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {joining ? "Joining..." : "Join workspace"}
              </button>

              <Link
                to="/workspaces"
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Back
              </Link>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{projects.length} projects</Pill>
            <Pill>/workspace/:id</Pill>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          {error && <Alert type="error">{error}</Alert>}
          {info && <Alert type="success">{info}</Alert>}
        </div>

        {joinRequests.length > 0 && (
          <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Join requests
              </h2>
              <Pill>{joinRequests.length} pending</Pill>
            </div>

            <div className="space-y-2">
              {joinRequests.map((r) => (
                <div
                  key={r._id}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      User:{" "}
                      <span className="font-mono">{String(r.userId)}</span>
                    </p>
                    {r.message ? (
                      <p className="mt-1 text-xs text-slate-600">{r.message}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approveRequest(r._id)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectRequest(r._id)}
                      className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Create project
            </h2>
            <Pill>Owner only</Pill>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Project name
              </label>
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <span className="text-slate-400">📌</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Description
              </label>
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <span className="text-slate-400">📝</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={createProject}
              disabled={creating || !name.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create"}
            </button>

            <button
              onClick={() => {
                setName("");
                setDescription("");
              }}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
            <Pill>{projects.length} total</Pill>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
              No projects yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p._id}
                  className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        <span className="font-mono">{p._id}</span>
                      </p>
                    </div>
                    <Pill>Project</Pill>
                  </div>

                  {p.description && (
                    <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => rename(p._id)}
                      className="rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => remove(p._id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">WorkspaceJoin</p>
          <p className="mt-1">
            Route: <span className="font-mono">/workspace/:id</span>
          </p>
        </div>
      </div>
    </div>
  );
}
