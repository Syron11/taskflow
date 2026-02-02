import React from "react";
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

export default function Projects() {
  const [workspaceId, setWorkspaceId] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [projects, setProjects] = React.useState([]);
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const load = async () => {
    setError("");
    setInfo("");
    if (!workspaceId.trim()) return setError("workspaceId is required");

    setLoading(true);
    try {
      const { data } = await api.get(
        `/projects?workspaceId=${workspaceId.trim()}`,
      );
      setProjects(data.projects || []);
      setInfo("Loaded projects.");
    } catch (err) {
      setError(err?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setError("");
    setInfo("");
    if (!workspaceId.trim()) return setError("workspaceId is required");
    if (!name.trim()) return setError("Project name is required");

    setCreating(true);
    try {
      const { data } = await api.post("/projects", {
        workspaceId: workspaceId.trim(),
        name: name.trim(),
        description: description.trim(),
      });
      setInfo(`Created project: ${data?.project?._id || "success"}`);
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Create failed (owner only)");
    } finally {
      setCreating(false);
    }
  };

  const rename = async (id) => {
    const newName = prompt("New project name:");
    if (!newName) return;
    try {
      await api.patch(`/projects/${id}`, { name: newName });
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Rename failed");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Projects
            </h1>
            <Pill>{projects.length} total</Pill>
          </div>
          <p className="text-sm text-slate-600">
            Load projects by workspace ID. Owners can create, rename, and delete
            projects.
          </p>
        </div>

        {/* Controls grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Load card */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Workspace
              </h2>
              <Pill>Required</Pill>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                workspaceId
              </label>
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <span className="text-slate-400">#</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 font-mono"
                  placeholder="paste workspaceId here"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load"}
              </button>

              <button
                onClick={() => {
                  setWorkspaceId("");
                  setProjects([]);
                  setError("");
                  setInfo("");
                }}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {error && <Alert type="error">{error}</Alert>}
              {info && <Alert type="success">{info}</Alert>}
            </div>
          </div>

          {/* Create card */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Create project
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  <span className="font-medium">Owner only</span> — if you are
                  not owner, server will reject.
                </p>
              </div>
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
                    placeholder="e.g. Database Final"
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
                    placeholder="short description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={create}
                disabled={creating || !workspaceId.trim() || !name.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
        </div>

        {/* Projects list */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Projects list
            </h2>
            <Pill>workspaceId: {workspaceId ? "set" : "not set"}</Pill>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
              {workspaceId
                ? "No projects found. Create one (owner only) or check workspaceId."
                : "Enter a workspaceId and click Load to see projects."}
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
                        ID: <span className="font-mono">{p._id}</span>
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

        {/* Tip */}
        <div className="mt-6 rounded-2xl border bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Tip</p>
          <p className="mt-1">
            Лучше передавать <span className="font-mono">workspaceId</span>{" "}
            через URL (например:{" "}
            <span className="font-mono">/projects/:workspaceId</span>), но для
            демо можно и так.
          </p>
        </div>
      </div>
    </div>
  );
}
