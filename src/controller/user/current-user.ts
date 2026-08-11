import {
  AccessTypeEnum,
  AppError,
  sendResponse,
  type TUser
} from "@/common";
import { catchAsync } from "@/middleware";

export const currentUser = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    const user = req.user as TUser;

    if (!user) {
      throw new AppError("User not found");
    };
    return sendResponse(res, 200, null, user.toObject());
  });
