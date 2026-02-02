import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    listId: { type: mongoose.Schema.Types.ObjectId, required: true }, 

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" }, 
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },

    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: String }],

    dueDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    order: { type: Number, default: 1 }, 
    completedAt: { type: Date },
  },
  { timestamps: true }
);

//  Compound indexes for speed
taskSchema.index({ boardId: 1, listId: 1, order: 1 });
taskSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model("Task", taskSchema);
