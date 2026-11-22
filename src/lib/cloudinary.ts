import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const PROFILE_IMAGE_FOLDER = "rusauth/profile-images";

/** The only profile photo formats accepted (signed into every upload). */
export const ALLOWED_IMAGE_FORMATS = "png,jpg,jpeg";

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

/**
 * Deletes a profile image from Cloudinary.
 * Returns true when the image is gone ("ok" or already "not found"), false
 * when Cloudinary could not be reached or refused, so callers that must not
 * leave an orphaned photo (account deletion) can stop and retry.
 */
export async function destroyProfileImage(
  publicId: string,
  uid: string,
): Promise<boolean> {
  // Never touch a file that does not belong to this user.
  if (!isUserPublicId(publicId, uid)) return true;

  try {
    const result: { result?: string } = await cloudinary.uploader.destroy(
      publicId,
      { invalidate: true, resource_type: "image" },
    );

    if (result?.result !== "ok" && result?.result !== "not found") {
      console.error("Cloudinary image delete refused:", result);
      return false;
    }
  } catch (error) {
    console.error("Cloudinary image delete error:", error);
    return false;
  }

  if (publicId.startsWith(`${legacyFolder(uid)}/`)) {
    try {
      await cloudinary.api.delete_folder(legacyFolder(uid));
    } catch {}
  }

  return true;
}

export default cloudinary;
