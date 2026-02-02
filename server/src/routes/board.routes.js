import express from "express";
import mongoose from "mongoose";
import Board from "../models/Board.js";
import Project from "../models/Project.js";
import Workspace from "../models/Workspace.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const isMember = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId));

const isOwner = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId) && m.role === "owner");

// helper: get workspace by projectId
const getWorkspaceByProject = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return { project: null, ws: null };
  const ws = await Workspace.findById(project.workspaceId);
  return { project, ws };
};

/**
 * POST /api/boards
 * owner-only create board inside project
 * body: { projectId, name }
 */
router.post("/", auth, async (req, res) => {
  try {
    const { projectId, name } = req.body;

    if (!projectId || !name?.trim()) {
      return res.status(400).json({ success: false, message: "projectId and name are required" });
    }
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid projectId" });
    }

    const { project, ws } = await getWorkspaceByProject(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    // Default columns
    const lists = [
      { title: "To Do", order: 1 },
      { title: "Doing", order: 2 },
      { title: "Done", order: 3 },
    ];

    const board = await Board.create({
      projectId,
      name: name.trim(),
      createdBy: req.user._id,
      lists,
    });

    res.json({ success: true, board });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/boards?projectId=
 * member can view if belongs to workspace of that project
 */
router.get("/", auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: "projectId query is required" });
    if (!mongoose.isValidObjectId(projectId)) return res.status(400).json({ success: false, message: "Invalid projectId" });

    const { project, ws } = await getWorkspaceByProject(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    const boards = await Board.find({ projectId })
      .sort({ createdAt: -1 })
      .select("_id projectId name lists createdAt updatedAt");

    res.json({ success: true, boards });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PATCH /api/boards/:id/lists
 * advanced update: add / rename / delete / reorder columns
 * owner-only
 *
 * body examples:
 * { "action": "add", "title": "Review" }
 * { "action": "rename", "listId": "...", "title": "In Progress" }
 * { "action": "delete", "listId": "..." }
 * { "action": "reorder", "orders": [{ "listId": "...", "order": 1 }, ...] }
 */
router.patch("/:id/lists", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid board id" });
    }

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });

    const { project, ws } = await getWorkspaceByProject(board.projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    // --- ADD ---
    if (action === "add") {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ success: false, message: "title is required" });

      const maxOrder = board.lists.reduce((m, l) => Math.max(m, l.order), 0);
      board.lists.push({ title, order: maxOrder + 1 });
      await board.save();

      return res.json({ success: true, board });
    }

    // --- RENAME (uses arrayFilters) ---
    if (action === "rename") {
      const { listId } = req.body;
      const title = String(req.body.title || "").trim();
      if (!mongoose.isValidObjectId(listId) || !title) {
        return res.status(400).json({ success: false, message: "listId and title are required" });
      }

      const updated = await Board.findOneAndUpdate(
        { _id: id },
        { $set: { "lists.$[l].title": title } },
        { new: true, arrayFilters: [{ "l._id": new mongoose.Types.ObjectId(listId) }] }
      );

      return res.json({ success: true, board: updated });
    }

    // --- DELETE (pull from array) ---
    if (action === "delete") {
      const { listId } = req.body;
      if (!mongoose.isValidObjectId(listId)) {
        return res.status(400).json({ success: false, message: "listId is required" });
      }

      const updated = await Board.findOneAndUpdate(
        { _id: id },
        { $pull: { lists: { _id: new mongoose.Types.ObjectId(listId) } } },
        { new: true }
      );

      return res.json({ success: true, board: updated });
    }

    // --- REORDER ---
    if (action === "reorder") {
      const orders = Array.isArray(req.body.orders) ? req.body.orders : [];
      if (orders.length === 0) {
        return res.status(400).json({ success: false, message: "orders array is required" });
      }

      // apply in memory
      const map = new Map(orders.map((o) => [String(o.listId), Number(o.order)]));
      board.lists.forEach((l) => {
        const newOrder = map.get(String(l._id));
        if (Number.isFinite(newOrder)) l.order = newOrder;
      });

      await board.save();
      return res.json({ success: true, board });
    }

    return res.status(400).json({ success: false, message: "Invalid action" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
