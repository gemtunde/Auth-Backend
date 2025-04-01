import mongoose, { Schema } from "mongoose";
import { VerificationEnum } from "../../common/enums/veerification-code.enum";
import { generateUniqueCode } from "../../common/utils/uuid";

export interface VerificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  type: VerificationEnum;
  expiredAt: Date;
  createdAt: Date;
}

const verificationSchema = new mongoose.Schema<VerificationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    default: generateUniqueCode,
  },
  type: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, required: true },
  expiredAt: { type: Date, required: true },
});

const Verification = mongoose.model<VerificationDocument>(
  "Verification",
  verificationSchema
);
export default Verification;
