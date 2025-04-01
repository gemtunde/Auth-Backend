import { Request, Response } from "express";
import { HTTPSTATUS } from "../../config/http.config";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthService } from "./auth.service";
import {
  loginSchema,
  registerSchema,
} from "../../common/validators/auth.validator";
import { setAuthenticationCookies } from "../../common/utils/cookies";

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
}
