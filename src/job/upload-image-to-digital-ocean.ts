import {
  encryptData,
  getCache,
  setCache,
  uploadFile,
  type IDojahCachedDetails,
  type IUploadImageToDigitalOceanJob,
} from "@/common";
import { User } from "@/model";

export const uploadImageToDigitalOcean = async (
  data: IUploadImageToDigitalOceanJob,
) => {
  const { identifier, userId, kycType, imageBase64, idBase64 } = data;
  const image = imageBase64
    ? await uploadFile(imageBase64, `${kycType}-${userId}`, "png")
    : undefined;
  const idUrl = idBase64
    ? encryptData(await uploadFile(idBase64, `${kycType}-id-${userId}`, "pdf"))
    : undefined;
  if (!image && !idUrl) return;

  const cacheKey = `IDENTIFIER_${kycType}:${identifier}`;
  const cached = await getCache<IDojahCachedDetails>(cacheKey);
  if (cached) {
    await setCache(cacheKey, { ...cached, image: image || cached.image, idUrl: idUrl || cached.idUrl }, 3 * 24 * 60 * 60);
  }

  await User.updateOne(
    {
      _id: userId,
      [`kyc.${kycType}.completed`]: true,
      [`kyc.${kycType}.identifier`]: identifier,
    },
    {
      $set: {
        ...(image && { [`kyc.${kycType}.details.image`]: image }),
        ...(idUrl && { [`kyc.${kycType}.details.idUrl`]: idUrl }),
      },
    },
  );
};
