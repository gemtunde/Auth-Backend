import jwt from "jsonwebtoken";
import { ErrorCode } from "../../common/enums/error-code.enum";
import { VerificationEnum } from "../../common/enums/veerification-code.enum";
import { LoginDto, RegisterDto } from "../../common/interface/auth.interface";
import { BadRequestException } from "../../common/utils/catch-errors";
import { fortyFiveMinutesFromNow } from "../../common/utils/date-time";
import UserModel from "../../database/models/user.model";
import Verification from "../../database/models/verification.model";
import Session from "../../database/models/session.model";
import { config } from "../../config/app.config";

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
    // const userId = newUser._id;

    //send verification code
    // const verificationCode = await Verification.create({
    //   userId,
    //   type: VerificationEnum.EMAIL_VERIFICATION,
    //   expiredAt: fortyFiveMinutesFromNow(),
    // });
    //send email to user with verification code

    //  console.log("User registered:", data);
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

    const session = await Session.create({
      userId: loginUser._id,
      userAgent,
    });
    const accessToken = jwt.sign(
      { userId: loginUser._id, sessionId: session._id },
      config.JWT.SECRET,
      {
        audience: ["user"],
        expiresIn: "15m",
        //expiresIn: config.JWT.EXPIRES_IN
      }
    );

    const refreshToken = jwt.sign(
      { sessionId: session._id },
      config.JWT.REFRESH_SECRET,
      {
        audience: ["user"],
        expiresIn: "30d",
      }
    );

    return {
      loginUser,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }
}
