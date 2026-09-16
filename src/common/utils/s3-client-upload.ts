import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENVIRONMENT } from "../config";

export const s3Client = new S3Client({
  endpoint: `https://${ENVIRONMENT.DIGITAL_OCEAN.SPACE_LINK}`,
  region: ENVIRONMENT.DIGITAL_OCEAN.SPACE_LINK?.split(".")[0],
  credentials: {
    accessKeyId: ENVIRONMENT.DIGITAL_OCEAN.SPACES_KEYID!,
    secretAccessKey: ENVIRONMENT.DIGITAL_OCEAN.SPACES_SECRET!,
  },
});

export const uploadFile = async (base64: string, name: string, extension: "png" | "pdf") => {
  const key = `${name}.${extension}`;
  const body = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  await s3Client.send(new PutObjectCommand({
    Bucket: ENVIRONMENT.DIGITAL_OCEAN.BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: extension === "pdf" ? "application/pdf" : "image/png",
    ACL: "public-read",
  }));
  return `https://${ENVIRONMENT.DIGITAL_OCEAN.BUCKET_NAME}.${ENVIRONMENT.DIGITAL_OCEAN.SPACE_LINK}/${key}`;
};
