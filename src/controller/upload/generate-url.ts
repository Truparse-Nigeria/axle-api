import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError, ENVIRONMENT, generateRandomCode, s3Client, sendResponse } from "@/common";
import { catchAsync } from "@/middleware";

const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
};

export const generateUploadUrl = catchAsync(async (req, res) => {
  const fileType = req.query.fileType as string | undefined;
  if (!fileType) throw new AppError("fileType is required", 400);
  const extension = ALLOWED_UPLOAD_TYPES[fileType];
  if (!extension) throw new AppError("Unsupported file type", 400);
  const fileName = `${generateRandomCode(10)}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: ENVIRONMENT.DIGITAL_OCEAN.BUCKET_NAME,
    Key: fileName,
    ContentType: fileType,
    ACL: "public-read",
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  return sendResponse(res, 200, "Upload URL generated successfully", {
    uploadUrl,
    fileUrl: `https://${ENVIRONMENT.DIGITAL_OCEAN.BUCKET_NAME}.${ENVIRONMENT.DIGITAL_OCEAN.SPACE_LINK}/${fileName}`,
  });
});
