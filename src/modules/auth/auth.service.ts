import { ErrorCode } from "../../common/enums/error-code.enum";
import { VerificationEnum } from "../../common/enums/veerification-code.enum";
import { RegisterDto } from "../../common/interface/auth.interface";
import { BadRequestException } from "../../common/utils/catch-errors";
import { fortyFiveMinutesFromNow } from "../../common/utils/date-time";
import UserModel from "../../database/models/user.model";
import Verification from "../../database/models/verification.model";

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
}
