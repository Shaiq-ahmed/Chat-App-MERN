const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "file"],
      required: true,
    },
    fileUrl: {
      type: String,
    },
    seen: {
      type: Boolean,
      default: false,
      required: true,
    },
    readBy:{
        type:[mongoose.Schema.Types.ObjectId],
        ref:"User",
        default: [], 
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ chat: 1, createdAt: -1 }); // Index for chat messages sorted by time

module.exports = mongoose.model("Message", messageSchema);
