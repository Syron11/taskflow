import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Compound index for faster listing/search inside workspace
projectSchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.model("Project", projectSchema);
