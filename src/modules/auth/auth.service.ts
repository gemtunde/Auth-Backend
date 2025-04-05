import jwt from "jsonwebtoken";
import { ErrorCode } from "../../common/enums/error-code.enum";
import { VerificationEnum } from "../../common/enums/verification-code.enum";
import {
  LoginDto,
  RegisterDto,
  resetPasswordDto,
} from "../../common/interface/auth.interface";
import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "../../common/utils/catch-errors";
import {
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
  threeMinutesAgo,
} from "../../common/utils/date-time";
import UserModel from "../../database/models/user.model";
import Verification from "../../database/models/verification.model";
import Session from "../../database/models/session.model";
import { config } from "../../config/app.config";
import {
  refreshTokenSignOptions,
  RefreshTPayload,
  signJwtToken,
  verifyJwtToken,
} from "../../common/utils/jwt";
// import { sendEmail } from "../../mailers/mailer";
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "../../mailers/templates/templates";
import { sendEmail } from "../../mailers/mailer";
import { HTTPSTATUS } from "../../config/http.config";
import { hashValue } from "../../common/utils/bcrypt";

export class AuthService {
  public async register(registerData: RegisterDto) {
    // Simulate user registration logic

    const { name, email, password } = registerData;

    const existingUser = await UserModel.exists({ email });
    if (existingUser) {
      throw new BadRequestException(
        "User already exists with this email",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    const newUser = await UserModel.create({
      name,
      email,
      password,
    });
    const userId = newUser._id;

    //send verification code
    const verificationCode = await Verification.create({
      userId,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: fortyFiveMinutesFromNow(),
    });
    // send email to user with verification code
    const verificationUrl = `${config.APP_ORIGIN}/confirm-account?code=${verificationCode.code}`;

    await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verificationUrl),
    });
    // console.log("User registered:", verificationCode);
    return {
      user: newUser,
      // message: "User registered successfully"
    };
  }
  public async login(loginData: LoginDto) {
    // Simulate user registration logic

    const { email, password, userAgent } = loginData;

    const loginUser = await UserModel.findOne({ email });
    if (!loginUser) {
      throw new BadRequestException(
        "Invalid email or password",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }
    const isPasswordMatch = await loginUser.comparePassword(password);

    if (!isPasswordMatch) {
      throw new BadRequestException(
        "Invalid email or password",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    //check if user enable 2fa
    if (loginUser.userPreferences.enable2FA) {
      return {
        loginUser: null,
        accessToken: "",
        refreshToken: "",
        mfaRequired: true,
      };
    }

    const session = await Session.create({
      userId: loginUser._id,
      userAgent,
    });
    const accessToken = signJwtToken({
      userId: loginUser._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );

    return {
      loginUser,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  public async refreshToken(refreshToken: string) {
    const { payload } = verifyJwtToken<RefreshTPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });

    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await Session.findById(payload.sessionId);
    const now = Date.now();

    if (!session) {
      throw new UnauthorizedException("Session does not exist");
    }

    if (session.expiredAt.getTime() <= now) {
      throw new UnauthorizedException("Session expired");
    }

    const sessionRequireRefresh =
      session.expiredAt.getTime() - now <= ONE_DAY_IN_MS;

    if (sessionRequireRefresh) {
      session.expiredAt = calculateExpirationDate(
        config.JWT.REFRESH_EXPIRES_IN
      );
      await session.save();
    }

    const newRefreshToken = sessionRequireRefresh
      ? signJwtToken(
          {
            sessionId: session._id,
          },
          refreshTokenSignOptions
        )
      : undefined;

    const accessToken = signJwtToken({
      userId: session.userId,
      sessionId: session._id,
    });

    return {
      accessToken,
      newRefreshToken,
    };
  }

  public async verifyEmail(code: string) {
    const validCode = await Verification.findOne({
      code: code,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new BadRequestException(
        "Invalid or expired verification code"
        // ErrorCode.AUTH_INVALID_VERIFICATION_CODE
      );
    }
    const updatedUser = await UserModel.findByIdAndUpdate(
      validCode.userId,
      {
        isEmailVerified: true,
      },
      { new: true }
    );
    if (!updatedUser) {
      throw new BadRequestException(
        "User not found",
        ErrorCode.VERIFICATION_ERROR
      );
    }
    // Delete the verification code after successful verification
    await Verification.deleteOne({ _id: validCode._id });

    // send success response
    return {
      user: updatedUser,
    };
  }

  public async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new NotFoundException(
        "User not found",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }
    // check mail rate limit is 2 emails per 3 or 10 minutes
    const timeAgo = threeMinutesAgo();
    const maxAttempts = 2;

    const count = await Verification.countDocuments({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      createdAt: { $gt: timeAgo },
    });

    if (count >= maxAttempts) {
      throw new HttpException(
        "Too many requests, please try again later",
        HTTPSTATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS
      );
    }
    const expiresAt = anHourFromNow();
    const validCode = await Verification.create({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt,
    });
    // send email to user with verification code
    const verificationUrl = `${config.APP_ORIGIN}/reset-password?code=${validCode.code}&exp=${expiresAt.getTime()}`;

    await sendEmail({
      to: user.email,
      ...passwordResetTemplate(verificationUrl),
    });
  }

  public async resetPassword({ password, verificationCode }: resetPasswordDto) {
    const validCode = await Verification.findOne({
      code: verificationCode,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new NotFoundException("Invalid or expired verification code");
    }
    const hashedPassword = await hashValue(password);
    const updatedUser = await UserModel.findByIdAndUpdate(
      validCode.userId,
      {
        password: hashedPassword,
      },
      { new: true }
    );
    if (!updatedUser) {
      throw new BadRequestException(
        "User not found",
        ErrorCode.VERIFICATION_ERROR
      );
    }
    // Delete the verification code after successful verification
    await Verification.deleteOne({ _id: validCode._id });

    await Session.deleteMany({
      userId: updatedUser._id,
    });
    // send success response
    return {
      user: updatedUser,
    };
  }
  public async logout(sessionId: string) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return await session.deleteOne();
  }
}
