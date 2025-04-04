import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { SessionService } from "./session.service";
import { HTTPSTATUS } from "../../config/http.config";
import { NotFoundException } from "../../common/utils/catch-errors";
import { z } from "zod";

export class SessionController {
  private sessionService: SessionService;

  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }
  public getAllSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.sessionId;
    const { sessions } = await this.sessionService.getAllSession(userId);
    const modifySession = sessions.map((session) => ({
      ...session.toObject(),
      ...(session.id === sessionId && {
        isCurrent: true,
      }),
    }));
    return res.status(HTTPSTATUS.OK).json({
      sessions: modifySession,
      message: "Sessions fetched successfully",
    });
  });

  public getSession = asyncHandler(async (req: Request, res: Response) => {
    // Add your implementation here
    const sessionId = req.sessionId;

    if (!sessionId) {
      throw new NotFoundException("Session Id not found, Please login");
    }
    const { user } = await this.sessionService.getSessionById(sessionId);

    return res.status(HTTPSTATUS.OK).json({
      user,
      message: "Session fetched successfully",
    });
  });
  public deleteSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = z.string().parse(req.params.id);
    const userId = req.user?.id;
    await this.sessionService.deleteSession(sessionId, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Session remove successfully",
    });
  });
}
