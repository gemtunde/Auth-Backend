import mongoose, { Document, Schema } from "mongoose";

interface UserPreference {
  enable2FA: boolean;
  emailNotifications: boolean;
  twoFactorSecret?: string;
}
export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  userPreference: UserPreference;
  comparePassword: (password: string) => Promise<boolean>;
}

const userPreferenceSchema = new Schema<UserPreference>({
  enable2FA: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  twoFactorSecret: { type: String, required: false },
});

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    userPreference: {
      type: userPreferenceSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {},
  }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    // Hash password logic here
    this.password = await hashPassword(this.password);
  }
});

userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.userPreference.twoFactorSecret;
    return ret;
  },
});

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
