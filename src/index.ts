import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config";
import connectDatabase from "./database/database";
import { errorHandler } from "./middlewares/errorHandler";
import { HTTPSTATUS } from "./config/http.config";
import { asyncHandler } from "./middlewares/asyncHandler";
import { BadRequestException } from "./common/utils/catch-errors";
import authRoutes from "./modules/auth/auth.routes";

const app = express();
const BASE_PATH = config.BASE_PATH;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: config.APP_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());

// Routes
app.get(
  "/",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // throw new BadRequestException("Bad Test error");
    res.status(HTTPSTATUS.OK).json({
      message: "Welcome to the API",
    });
  })
);

//routes

app.use(`${BASE_PATH}/auth`, authRoutes);

app.use(errorHandler);
// Start server
app.listen(config.PORT, async () => {
  console.log(`Server is running on port ${config.PORT}`);
  await connectDatabase();
});
