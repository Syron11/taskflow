import mongoose from "mongoose";

const listSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
  },
  { timestamps: false }
);

const boardSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Embedded columns
    lists: { type: [listSchema], default: [] },
  },
  { timestamps: true }
);

boardSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("Board", boardSchema);
