import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const PROFILE_IMAGE_FOLDER = "rusauth/profile-images";

export function createProfilePublicId(uid: string): string {
  return `${uid}_${randomBytes(8).toString("hex")}`;
}

function legacyFolder(uid: string): string {
  return `${PROFILE_IMAGE_FOLDER}/${uid}`;
}

export function isUserPublicId(publicId: string, uid: string): boolean {
  const parts = publicId.split("/");

  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    return false;
  }

  const isCurrent = parts[parts.length - 1].startsWith(`${uid}_`);
  const isLegacy = publicId.startsWith(`${legacyFolder(uid)}/`);

  return isCurrent || isLegacy;
}

export async function destroyProfileImage(
  publicId: string,
  uid: string,
): Promise<void> {
  if (!isUserPublicId(publicId, uid)) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: "image",
    });
  } catch (error) {
    console.error("Cloudinary image delete error:", error);
    return;
  }

  if (publicId.startsWith(`${legacyFolder(uid)}/`)) {
    try {
      await cloudinary.api.delete_folder(legacyFolder(uid));
    } catch {}
  }
}

export default cloudinary;
