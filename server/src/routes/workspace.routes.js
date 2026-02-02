import express from "express";
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();



const isOwner = (ws, userId) =>
  String(ws.ownerId) === String(userId) ||
  ws.members?.some(
    (m) => String(m.userId) === String(userId) && m.role === "owner",
  );

const isMember = (ws, userId) =>
  ws.members?.some((m) => String(m.userId) === String(userId));


/**
 * POST /api/workspaces
 * Create workspace (creator becomes owner)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Name required" });
    }

    const ws = await Workspace.create({
      name: name.trim(),
      ownerId: req.user._id,
      members: [{ userId: req.user._id, role: "owner", joinedAt: new Date() }],
    });

    res.json({ success: true, workspace: ws });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/workspaces
 * List workspaces where user is a member
 */
router.get("/", auth, async (req, res) => {
  try {
    const list = await Workspace.find({ "members.userId": req.user._id })
      .select("_id name ownerId members createdAt updatedAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, workspaces: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/workspaces/:id/join-requests
 * Submit join request (any user)
 */
router.post("/:id/join-requests", auth, async (req, res) => {
  try {
    const { message = "" } = req.body;

    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (isMember(ws, req.user._id)) {
      return res.status(400).json({ success: false, message: "Already a member" });
    }

    const alreadyPending = ws.joinRequests?.some(
      (r) => String(r.userId) === String(req.user._id) && r.status === "pending"
    );
    if (alreadyPending) {
      return res.status(400).json({ success: false, message: "Request already pending" });
    }

    ws.joinRequests.push({
      userId: req.user._id,
      message,
      status: "pending",
      createdAt: new Date(),
    });

    await ws.save();
    res.json({ success: true, message: "Join request sent" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/workspaces/:id/join-requests?status=pending
 * Owner can view join requests
 */
router.get("/:id/join-requests", auth, async (req, res) => {
  try {
    const { status } = req.query;

    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    let reqs = ws.joinRequests || [];
    if (status) reqs = reqs.filter((r) => r.status === status);

    res.json({ success: true, joinRequests: reqs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PATCH /api/workspaces/:id/join-requests/:requestId/approve
 * Owner approves: set request status + push member (advanced update with arrayFilters)
 */
router.patch("/:id/join-requests/:requestId/approve", auth, async (req, res) => {
  try {
    const { id, requestId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const ws = await Workspace.findById(id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    const jr = ws.joinRequests?.find((r) => String(r._id) === String(requestId));
    if (!jr) return res.status(404).json({ success: false, message: "Join request not found" });
    if (jr.status !== "pending") {
      return res.status(400).json({ success: false, message: "Request is not pending" });
    }

    // If user already became member (edge case)
    if (isMember(ws, jr.userId)) {
      return res.status(400).json({ success: false, message: "User already a member" });
    }

    const updated = await Workspace.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          "joinRequests.$[r].status": "approved",
          "joinRequests.$[r].reviewedAt": new Date(),
        },
        $push: {
          members: { userId: jr.userId, role: "member", joinedAt: new Date() },
        },
      },
      {
        new: true,
        arrayFilters: [{ "r._id": new mongoose.Types.ObjectId(requestId), "r.status": "pending" }],
      }
    );

    res.json({ success: true, workspace: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PATCH /api/workspaces/:id/join-requests/:requestId/reject
 * Owner rejects: set request status (advanced update with arrayFilters)
 */
router.patch("/:id/join-requests/:requestId/reject", auth, async (req, res) => {
  try {
    const { id, requestId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const ws = await Workspace.findById(id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isOwner(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Owner only" });
    }

    const updated = await Workspace.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          "joinRequests.$[r].status": "rejected",
          "joinRequests.$[r].reviewedAt": new Date(),
        },
      },
      {
        new: true,
        arrayFilters: [{ "r._id": new mongoose.Types.ObjectId(requestId), "r.status": "pending" }],
      }
    );

    res.json({ success: true, workspace: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
