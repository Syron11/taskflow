import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Board from "../models/Board.js";
import Project from "../models/Project.js";
import Workspace from "../models/Workspace.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const isMember = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId));

const isOwner = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId) && m.role === "owner");

/**
 * helper: resolve ws/project/board
 */
const resolveContextByBoard = async (boardId) => {
  const board = await Board.findById(boardId);
  if (!board) return { board: null, project: null, ws: null };
  const project = await Project.findById(board.projectId);
  if (!project) return { board, project: null, ws: null };
  const ws = await Workspace.findById(project.workspaceId);
  return { board, project, ws };
};

const listExists = (board, listId) =>
  board?.lists?.some((l) => String(l._id) === String(listId));

/**
 * POST /api/tasks
 * body: { boardId, listId, title, description?, priority?, dueDate?, assignedTo?, tags? }
 * member can create
 */
router.post("/", auth, async (req, res) => {
  try {
    const { boardId, listId, title } = req.body;

    if (!mongoose.isValidObjectId(boardId) || !mongoose.isValidObjectId(listId) || !title?.trim()) {
      return res.status(400).json({ success: false, message: "boardId, listId, title are required" });
    }

    const { board, project, ws } = await resolveContextByBoard(boardId);
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    if (!listExists(board, listId)) {
      return res.status(400).json({ success: false, message: "listId does not exist on this board" });
    }

    // order = last+1 inside list
    const last = await Task.find({ boardId, listId }).sort({ order: -1 }).limit(1);
    const nextOrder = last.length ? (last[0].order || 0) + 1 : 1;

    const task = await Task.create({
      boardId,
      projectId: project._id,
      workspaceId: ws._id,
      listId,
      title: title.trim(),
      description: req.body.description || "",
      priority: req.body.priority || "medium",
      status: req.body.status || "todo",
      assignedTo: Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      dueDate: req.body.dueDate || null,
      createdBy: req.user._id,
      order: nextOrder,
    });

    res.json({ success: true, task });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/tasks?boardId=&listId=&status=&assignedTo=
 * member can view tasks if in workspace
 */
router.get("/", auth, async (req, res) => {
  try {
    const { boardId, listId, status, assignedTo } = req.query;
    if (!mongoose.isValidObjectId(boardId)) {
      return res.status(400).json({ success: false, message: "boardId query is required" });
    }

    const { board, ws } = await resolveContextByBoard(boardId);
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    const filter = { boardId };
    if (listId && mongoose.isValidObjectId(listId)) filter.listId = listId;
    if (status) filter.status = status;
    if (assignedTo && mongoose.isValidObjectId(assignedTo)) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter).sort({ listId: 1, order: 1, createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * member can update, but delete/strong actions owner-only (мы в delete сделаем)
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid task id" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const ws = await Workspace.findById(task.workspaceId);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    // editable fields
    const allowed = ["title", "description", "priority", "status", "assignedTo", "tags", "dueDate"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) task[key] = req.body[key];
    }

    // If status set to done -> completedAt
    if (req.body.status === "done") task.completedAt = new Date();
    if (req.body.status && req.body.status !== "done") task.completedAt = null;

    await task.save();
    res.json({ success: true, task });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PATCH /api/tasks/:id/move  ✅ Advanced update
 * Move task to another list + set order
 * body: { toListId, toOrder? }
 */
router.patch("/:id/move", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { toListId, toOrder } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(toListId)) {
      return res.status(400).json({ success: false, message: "Invalid id or toListId" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const { board, ws } = await resolveContextByBoard(task.boardId);
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    if (!listExists(board, toListId)) {
      return res.status(400).json({ success: false, message: "Target list does not exist" });
    }

    // If order not provided -> place at end
    let newOrder = Number(toOrder);
    if (!Number.isFinite(newOrder)) {
      const last = await Task.find({ boardId: task.boardId, listId: toListId }).sort({ order: -1 }).limit(1);
      newOrder = last.length ? (last[0].order || 0) + 1 : 1;
    }

    // advanced: update multiple fields at once
    const toList = board.lists.find((l) => String(l._id) === String(toListId));
    const title = String(toList?.title || "").toLowerCase();

    let newStatus = task.status;

    if (title.includes("to do") || title.includes("todo")) newStatus = "todo";
    else if (title.includes("doing")) newStatus = "doing";
    else if (title.includes("done")) newStatus = "done";

    const updated = await Task.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          listId: toListId,
          status: newStatus,
          order: newOrder,
          updatedAt: new Date(),
          completedAt: newStatus === "done" ? new Date() : null,
        },
      },
      { new: true },
    );


    res.json({ success: true, task: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * DELETE /api/tasks/:id
 * owner can delete any; member can delete only own created task
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid task id" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const ws = await Workspace.findById(task.workspaceId);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    const canDelete = isOwner(ws, req.user._id) || String(task.createdBy) === String(req.user._id);
    if (!canDelete) {
      return res.status(403).json({ success: false, message: "Not allowed to delete this task" });
    }

    await Task.deleteOne({ _id: id });
    res.json({ success: true, message: "Task deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
