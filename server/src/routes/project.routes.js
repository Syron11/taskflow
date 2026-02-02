import express from "express";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Workspace from "../models/Workspace.js";
import Board from "../models/Board.js";
import Task from "../models/Task.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// helpers
const getWorkspace = async (workspaceId) => {
  if (!mongoose.isValidObjectId(workspaceId)) return null;
  return Workspace.findById(workspaceId);
};

const isMember = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId));

const isOwner = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId) && m.role === "owner");

/**
 * POST /api/projects
 * body: { workspaceId, name, description? }
 * owner-only create (по нашим правилам)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { workspaceId, name, description = "" } = req.body;

    if (!workspaceId || !name?.trim()) {
      return res.status(400).json({ success: false, message: "workspaceId and name are required" });
    }

    const ws = await getWorkspace(workspaceId);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    const project = await Project.create({
      workspaceId,
      name: name.trim(),
      description,
      createdBy: req.user._id,
    });

    res.json({ success: true, project });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/projects?workspaceId=
 * member can view projects if belongs to workspace
 */
router.get("/", auth, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId query is required" });
    }

    const ws = await getWorkspace(workspaceId);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    const projects = await Project.find({ workspaceId })
      .sort({ createdAt: -1 })
      .select("_id workspaceId name description createdBy createdAt updatedAt");

    res.json({ success: true, projects });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PATCH /api/projects/:id
 * owner-only update
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid project id" });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const ws = await Workspace.findById(project.workspaceId);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    if (name !== undefined) project.name = String(name).trim();
    if (description !== undefined) project.description = String(description);

    await project.save();

    res.json({ success: true, project });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * DELETE /api/projects/:id
 * owner-only delete
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project id" });
    }

    const project = await Project.findById(id);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const ws = await Workspace.findById(project.workspaceId);
    if (!ws)
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    const boards = await Board.find({ projectId: project._id }).select("_id");
    const boardIds = boards.map((b) => b._id);

    await Task.deleteMany({ projectId: project._id });
    if (boardIds.length) {
      await Task.deleteMany({ boardId: { $in: boardIds } });
    }

    await Board.deleteMany({ projectId: project._id });
    await Project.deleteOne({ _id: project._id });

    res.json({
      success: true,
      message: "Project deleted with boards and tasks",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


export default router;
