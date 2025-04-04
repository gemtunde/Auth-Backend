import { NotFoundException } from "../../common/utils/catch-errors";
import Session from "../../database/models/session.model";

export class SessionService {
  public async getAllSession(userId: string) {
    // Logic to get all sessions for a user
    const sessions = await Session.find(
      {
        userId,
        expiredAt: { $gt: new Date() },
      },
      {
        _id: 1,
        userId: 1,
        userAgent: 1,
        createdAt: 1,
        expiredAt: 1,
      },
      {
        sort: { createdAt: -1 },
      }
    );
    // if (!sessions) {
    //   throw new Error("No sessions found");
    // }
    return { sessions };
  }

  public async getSessionById(sessionId: string) {
    const session = await Session.findById(sessionId)
      .populate("userId")
      .select("-expiresAt");

    if (!session) {
      throw new NotFoundException("Session not found");
    }
    const { userId: user } = session;

    return {
      user,
    };
  }

  public async deleteSession(sessionId: string, userId: string) {
    const deletedSession = await Session.findByIdAndDelete({
      _id: sessionId,
      userId: userId,
    });
    if (!deletedSession) {
      throw new NotFoundException("Session not found");
    }
    return;
  }
}
