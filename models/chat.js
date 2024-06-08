import mongoose, { Schema, model, Types } from "mongoose";

const schema = new Schema(
    {
      name: {
        type: String,
        required: true,
      },
      groupChat: {
        type: Boolean,
        default: false,
      },
      createdBy: {
        type: Types.ObjectId,
        ref: "User",
      },
      members: [
        {
          type: Types.ObjectId,
          ref: "User",
        },
      ],
      groupUrl: {
        type: String,
        default: "https://tse3.mm.bing.net/th?id=OIP.mCvA838qQGRl1clx4SQ1GwHaDs&pid=Api&P=0&h=180"
      }
    },
    {
      timestamps: true,
    }
  );
  
  export const Chat =mongoose.models.Chat || model("Chat", schema);