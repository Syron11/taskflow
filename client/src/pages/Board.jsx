import React from "react";
import { api } from "../api/axios";

function Pill({ children }) {
  return (
    <span className="rounded-full border bg-white px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}

export default function Board() {
  const [projectId, setProjectId] = React.useState("");
  const [boardName, setBoardName] = React.useState("Main Board");
  const [boards, setBoards] = React.useState([]);
  const [selectedBoard, setSelectedBoard] = React.useState(null);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadBoards = async () => {
    if (!projectId.trim()) return setError("projectId required");
    setError("");
    setLoading(true);
    try {
      const { data } = await api.get(`/boards?projectId=${projectId.trim()}`);
      setBoards(data.boards || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Load boards failed");
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!projectId.trim()) return setError("projectId required");
    try {
      await api.post("/boards", {
        projectId: projectId.trim(),
        name: boardName,
      });
      await loadBoards();
    } catch (err) {
      setError(err?.response?.data?.message || "Create board failed");
    }
  };

  const selectBoard = async (b) => {
    setSelectedBoard(b);
    setLoading(true);
    try {
      const { data } = await api.get(`/tasks?boardId=${b._id}`);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Load tasks failed");
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (listId) => {
    if (!selectedBoard) return;
    try {
      await api.post("/tasks", {
        boardId: selectedBoard._id,
        listId,
        title: taskTitle || "New Task",
      });
      setTaskTitle("");
      await selectBoard(selectedBoard);
    } catch (err) {
      setError(err?.response?.data?.message || "Create task failed");
    }
  };

  const moveTask = async (taskId, toListId) => {
    try {
      await api.patch(`/tasks/${taskId}/move`, { toListId });
      await selectBoard(selectedBoard);
    } catch (err) {
      setError(err?.response?.data?.message || "Move failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Board
          </h1>
          <p className="text-sm text-slate-600">
            Kanban board with lists and draggable-like task movement
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Project</h2>

            <div className="mt-3">
              <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
                <span className="text-slate-400">#</span>
                <input
                  className="w-full bg-transparent text-sm outline-none font-mono"
                  placeholder="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={loadBoards}
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Load boards
              </button>
              <button
                onClick={() => {
                  setBoards([]);
                  setSelectedBoard(null);
                  setTasks([]);
                }}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-600">
                Create board
              </h3>
              <div className="mt-2 flex gap-2">
                <input
                  className="flex-1 rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                />
                <button
                  onClick={createBoard}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Create
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Boards
            </h2>

            {boards.length === 0 ? (
              <p className="text-sm text-slate-600">No boards loaded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {boards.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => selectBoard(b)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium border ${
                      selectedBoard?._id === b._id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedBoard && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedBoard.name}
              </h2>
              <Pill>{tasks.length} tasks</Pill>
            </div>

            <div className="mt-3">
              <input
                className="w-full max-w-md rounded-xl border bg-white px-3 py-2 text-sm outline-none"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
              {selectedBoard.lists
                ?.slice()
                .sort((a, b) => a.order - b.order)
                .map((list) => (
                  <div
                    key={list._id}
                    className="w-80 shrink-0 rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {list.title}
                      </h3>
                      <button
                        onClick={() => createTask(list._id)}
                        className="text-xs font-medium text-slate-700 hover:underline"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="space-y-2">
                      {tasks
                        .filter((t) => String(t.listId) === String(list._id))
                        .map((t) => (
                          <div
                            key={t._id}
                            className="rounded-xl border bg-slate-50 p-3"
                          >
                            <p className="text-sm font-medium text-slate-900">
                              {t.title}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedBoard.lists
                                .filter(
                                  (l) => String(l._id) !== String(list._id),
                                )
                                .map((l) => (
                                  <button
                                    key={l._id}
                                    onClick={() => moveTask(t._id, l._id)}
                                    className="rounded-lg border bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                  >
                                    → {l.title}
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
