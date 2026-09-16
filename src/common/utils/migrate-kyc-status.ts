import mongoose from "mongoose";

export const migrateKycStatus = async () => {
  const users = mongoose.connection.collection("users");
  for (const type of ["bvn", "nin", "passport", "address", "selfie"]) {
    const path = `kyc.${type}.completed`;
    await users.updateMany({ [path]: "SUCCESS" }, { $set: { [path]: true } });
    await users.updateMany(
      { [path]: { $in: ["PENDING", "PROCESSING", "FAILED"] } },
      { $set: { [path]: false } },
    );
  }
};
