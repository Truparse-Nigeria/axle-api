import {
  AppError,
  createTagSchema,
  sendResponse,
  validateRequestPayload,
  type IUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User, type IUserDocument } from "@/model";

// Customer only endpoint
export const createTag = catchAsync(async (req, res) => {
  const { tag } = await validateRequestPayload(req.body, createTagSchema);

  const user = req.user! as IUserDocument;

  if (!user) {
    throw new AppError("User not found");
  }

  if (user.tag) {
    throw new AppError("You already have a tag.", 400);
  }

  const existingTag = await User.findOne({ tag });

  if (existingTag) {
    throw new AppError("This tag is already taken.", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { tag },
    { new: true },
  );

  if (!updatedUser) {
    throw new AppError("Oops! We couldn't set your tag. Try again.");
  }

  return sendResponse(res, 200, "Tag created successfully.", updatedUser);
});
