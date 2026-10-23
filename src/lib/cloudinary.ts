import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary এর সংযোগ কনফিগারেশন (সব মান env থেকে আসে)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// সব ব্যবহারকারীর ছবি এই একটি ফোল্ডারেই থাকে; ছবি মুছলে আলাদা ফাঁকা ফোল্ডার পড়ে থাকে না
export const PROFILE_IMAGE_FOLDER = "rusauth/profile-images";

// ছবির নাম uid দিয়ে শুরু হয়, তাই কার ছবি তা নামেই বোঝা যায়; পেছনের র‍্যান্ডম অংশ অনুমান করা যায় না
export function createProfilePublicId(uid: string): string {
  return `${uid}_${randomBytes(8).toString("hex")}`;
}

// আগের সংস্করণে প্রতি ব্যবহারকারীর আলাদা ফোল্ডার ছিল (rusauth/profile-images/<uid>/...)
function legacyFolder(uid: string): string {
  return `${PROFILE_IMAGE_FOLDER}/${uid}`;
}

// publicId টি এই ব্যবহারকারীর নিজের ছবির কিনা যাচাই (নতুন ও পুরোনো দুই নিয়মেই)
export function isUserPublicId(publicId: string, uid: string): boolean {
  const parts = publicId.split("/");

  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    return false;
  }

  const isCurrent = parts[parts.length - 1].startsWith(`${uid}_`);
  const isLegacy = publicId.startsWith(`${legacyFolder(uid)}/`);

  return isCurrent || isLegacy;
}

// Cloudinary থেকে ছবি মোছে; পুরোনো per-user ফোল্ডার ফাঁকা হয়ে গেলে সেটিও মুছে দেয়
// এটি রেসপন্সের পরে (after) চালানো হয়, তাই ব্যবহারকারীকে অপেক্ষা করতে হয় না
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
    } catch {
      // ফোল্ডারে আরও ফাইল থাকলে বা আগেই মুছে গেলে এরর আসে, সেটি উপেক্ষা করা হয়
    }
  }
}

export default cloudinary;
