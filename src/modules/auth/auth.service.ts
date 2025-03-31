import { RegisterDto } from "../../common/interface/auth.interface";

export class AuthService {
  public async register(registerData: RegisterDto) {
    // Simulate user registration logic

    const { name, email, password, userAgent } = registerData;

    // const existingUser =

    //  console.log("User registered:", data);
    return { message: "User registered successfully" };
  }
}
