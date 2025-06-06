import { Request } from "express";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../../common/utils/catch-errors";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import UserModel from "../../database/models/user.model";
import Session from "../../database/models/session.model";
import { refreshTokenSignOptions, signJwtToken } from "../../common/utils/jwt";

export class MfaService {
  public async generateMFASetup(req: Request) {
    const user = req.user;

    // Check if the user has already set up MFA
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }
    if (user.userPreferences.enable2FA) {
      return {
        message: "MFA already setup",
      };
    }
    // Generate MFA setup
    let secretKey = user.userPreferences.twoFactorSecret;
    if (!secretKey) {
      const secret = speakeasy.generateSecret({
        name: "gemtunde-2fa",
      });
      secretKey = secret.base32;
      user.userPreferences.twoFactorSecret = secretKey;
      await user.save();
    }
    const url = speakeasy.otpauthURL({
      secret: secretKey,
      label: user.email,
      //algorithm: "sha1",
      //counter: 0,
      issuer: "gemtunde",
      encoding: "base32",
    });
    const qrImageUrl = await qrcode.toDataURL(url);
    return {
      message: "MFA setup successfully",
      qrImageUrl,
      secret: secretKey,
    };
  }

  public async verifyMFASetup(req: Request, code: string, secretKey: string) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }
    if (user.userPreferences.enable2FA) {
      return {
        message: "MFA already setup",
        userPrefrences: { enable: user.userPreferences.enable2FA },
      };
    }
    const isValid = speakeasy.totp.verify({
      secret: secretKey,
      encoding: "base32",
      token: code,
    });
    if (!isValid) {
      throw new BadRequestException("Invalid MFA code");
    }
    user.userPreferences.enable2FA = true;
    await user.save();
    return {
      message: "MFA setup successfully",
      userPrefrences: { enable: user.userPreferences.enable2FA },
    };
  }

  public async revokeMFA(req: Request) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    if (!user.userPreferences.enable2FA) {
      return {
        message: "MFA is not enabled",
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    user.userPreferences.twoFactorSecret = undefined;
    user.userPreferences.enable2FA = false;
    await user.save();

    return {
      message: "MFA revoke successfully",
      userPreferences: {
        enable2FA: user.userPreferences.enable2FA,
      },
    };
  }
  public async verifyMFAForLogin(
    code: string,
    email: string,
    userAgent?: string
  ) {
    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (
      !user.userPreferences.enable2FA &&
      !user.userPreferences.twoFactorSecret
    ) {
      throw new UnauthorizedException("MFA not enabled for this user");
    }

    const isValid = speakeasy.totp.verify({
      secret: user.userPreferences.twoFactorSecret!,
      encoding: "base32",
      token: code,
    });

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again.");
    }

    //sign access token & refresh token
    const session = await Session.create({
      userId: user._id,
      userAgent,
    });

    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      {
        sessionId: session._id,
      },
      refreshTokenSignOptions
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
