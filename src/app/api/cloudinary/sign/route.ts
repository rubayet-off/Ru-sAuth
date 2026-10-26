import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import cloudinary, {
  PROFILE_IMAGE_FOLDER,
  createProfilePublicId,
} from "@/lib/cloudinary";
import { requireEnv } from "@/lib/env";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Security check failed.", 403);
  }

  try {
    const session = await requireActiveUserSession(request);

    if (!session) return errorResponse("Unauthorized.", 401);

    const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
    const apiKey = requireEnv("CLOUDINARY_API_KEY");
    const apiSecret = requireEnv("CLOUDINARY_API_SECRET");

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = createProfilePublicId(session.uid);

    const signature = cloudinary.utils.api_sign_request(
      { folder: PROFILE_IMAGE_FOLDER, public_id: publicId, timestamp },
      apiSecret,
    );

    return jsonResponse({
      signature,
      timestamp,
      folder: PROFILE_IMAGE_FOLDER,
      publicId,
      apiKey,
      cloudName,
    });
  } catch (error) {
    return handleRouteError(error, "Profile image signing error");
  }
}
