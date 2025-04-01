import { ErrorRequestHandler, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { AppError } from "../common/utils/AppError";
import { z } from "zod";
import {
  clearAuthenticationCookies,
  REFRESH_PATH,
} from "../common/utils/cookies";

// const formatZodError = (error: z.ZodError, res: Response) => {
//   const errors = error?.issues?.map((err) => ({
//     field: err.path.join("."),
//     message: err.message,
//   }))
//   return res.status(HTTPSTATUS.BAD_REQUEST).json({
//     message: "Validation Error",
//     errors: errors,
//  })
// }
const formatZodError = (res: Response<any>, error: z.ZodError) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: "Validation failed",
    errors: errors,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): any => {
  console.error(`Error occured on Path: ${req.path}`, error);

  if (req.path === REFRESH_PATH) {
    clearAuthenticationCookies(res);
  }

  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Bad Request, Invalid Json format, Please check your request",
      error: error?.message || "Invalid JSON",
    });
  }

  if (error instanceof z.ZodError) {
    return formatZodError(res, error);
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error?.message,
      error: error?.errorCode,
    });
  }
  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: error?.message || "Something went wrong",
  });
};
