import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Workspace from "../models/Workspace.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const isMember = (ws, userId) =>
  ws?.members?.some((m) => String(m.userId) === String(userId));

/**
 * GET /api/analytics/workspace/:id/summary
 * Multi-stage aggregation pipeline 
 */
router.get("/workspace/:id/summary", auth, async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    if (!mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({ success: false, message: "Invalid workspaceId" });
    }

    const ws = await Workspace.findById(workspaceId);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!isMember(ws, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    const now = new Date();

    const result = await Task.aggregate([
      // 1) filter by workspace
      { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },

      // 2) compute "isOverdue"
      {
        $addFields: {
          isOverdue: {
            $and: [
              { $ne: ["$status", "done"] },
              { $ne: ["$dueDate", null] },
              { $lt: ["$dueDate", now] },
            ],
          },
        },
      },

      // 3) run multiple analytics in one request (FACET)
      {
        $facet: {
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { _id: 0, status: "$_id", count: 1 } },
          ],
          overdue: [
            { $match: { isOverdue: true } },
            { $count: "count" },
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
            { $project: { _id: 0, priority: "$_id", count: 1 } },
          ],
          topAssigneesDone: [
            { $match: { status: "done" } },
            { $unwind: "$assignedTo" },
            { $group: { _id: "$assignedTo", doneCount: { $sum: 1 } } },
            { $sort: { doneCount: -1 } },
            { $limit: 5 },

            // optional: join user info for nicer output
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                userId: "$_id",
                doneCount: 1,
                name: "$user.name",
                email: "$user.email",
              },
            },
          ],
        },
      },

      // 4) normalize overdue
      {
        $addFields: {
          overdueCount: { $ifNull: [{ $arrayElemAt: ["$overdue.count", 0] }, 0] },
        },
      },
      {
        $project: {
          overdue: 0,
        },
      },
    ]);

    res.json({ success: true, summary: result[0] || {} });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
