import mongoose, { Schema } from "mongoose";
import { VerificationEnum } from "../../common/enums/verification-code.enum";
import { generateUniqueCode } from "../../common/utils/uuid";

export interface VerificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  type: VerificationEnum;
  expiresAt: Date;
  //expiredAt: Date;
  createdAt: Date;
}

const verificationSchema = new Schema<VerificationDocument>({
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
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const Verification = mongoose.model<VerificationDocument>(
  "Verification",
  verificationSchema,
  "verification_codes"
);
export default Verification;
