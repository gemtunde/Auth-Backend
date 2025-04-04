import { Request, Response } from "express";
import { HTTPSTATUS } from "../../config/http.config";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthService } from "./auth.service";
import {
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verificationEmailSchema,
} from "../../common/validators/auth.validator";
import {
  clearAuthenticationCookies,
  getAccessTokenCookieOptions,
  setAuthenticationCookies,
} from "../../common/utils/cookies";
import {
  NotFoundException,
  UnauthorizedException,
} from "../../common/utils/catch-errors";

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public register = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      // const userAgent = req.headers["user-agent"];
      const body = registerSchema.parse({
        ...req.body,
      });
      const { user } = await this.authService.register(body);

      return res.status(HTTPSTATUS.CREATED).json({
        message: "User registered successfully",
        data: user,
      });
    }
  );
  public login = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userAgent = req.headers["user-agent"];
      const body = loginSchema.parse({
        ...req.body,
        userAgent,
      });
      const { loginUser, refreshToken, accessToken, mfaRequired } =
        await this.authService.login(body);

      return setAuthenticationCookies({
        res,
        refreshToken,
        accessToken,
      })
        .status(HTTPSTATUS.OK)
        .json({
          message: "User login successfully",
          mfaRequired,
          loginUser,
        });
    }
  );
  public refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedException(
          "Missing refresh token, User not authorized"
        );
      }
      const { accessToken, newRefreshToken } =
        await this.authService.refreshToken(refreshToken);

      if (newRefreshToken) {
        res.cookie(
          "refreshToken",
          newRefreshToken,
          getAccessTokenCookieOptions()
        );
      }
      return res
        .status(HTTPSTATUS.OK)
        .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
        .json({
          message: "Token refreshed successfully",
        });
    }
  );
  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code } = verificationEmailSchema.parse(req.body);
      await this.authService.verifyEmail(code);
      return res.status(HTTPSTATUS.OK).json({
        message: "Email verified successfully",
      });
    }
  );
  public forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { email } = forgotPasswordSchema.parse(req.body);
      await this.authService.forgotPassword(email);
      res.status(HTTPSTATUS.OK).json({
        message: "Password reset link sent successfully",
      });
    }
  );
  public resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const body = resetPasswordSchema.parse(req.body);
      await this.authService.resetPassword(body);
      return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
        message: "Password reset successfully",
      });
    }
  );
  public logout = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const sessionId = req.sessionId;
      if (!sessionId) {
        throw new NotFoundException("Session not found");
      }
      await this.authService.logout(sessionId);
      return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
        message: "User logout successfully",
      });
    }
  );
}
