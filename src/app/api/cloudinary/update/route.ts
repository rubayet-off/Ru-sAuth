import { after, type NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { destroyProfileImage, isUserPublicId } from "@/lib/cloudinary";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";

function isValidImageUrl(value: string, publicId: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) return false;

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      decodeURIComponent(url.pathname).includes(publicId)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Security check failed.", 403);
  }

  try {
    const session = await requireActiveUserSession(request);

    if (!session) return errorResponse("Unauthorized.", 401);

    const body = await readJsonBody(request);
    const imageUrl = body?.imageUrl;
    const publicId = body?.publicId;

    if (
      typeof imageUrl !== "string" ||
      typeof publicId !== "string" ||
      !isUserPublicId(publicId, session.uid) ||
      !isValidImageUrl(imageUrl, publicId)
    ) {
      return errorResponse("Invalid profile image data.", 400);
    }

    const result = await pool.query<{ old_public_id: string | null }>(
      `
        WITH old AS (
          SELECT profile_image_public_id
          FROM users
          WHERE uid = $3 AND is_account_deleted = FALSE
          FOR UPDATE
        )
        UPDATE users
        SET profile_image_public_url = $1,
            profile_image_public_id = $2
        FROM old
        WHERE users.uid = $3 AND users.is_account_deleted = FALSE
        RETURNING old.profile_image_public_id AS old_public_id
      `,
      [imageUrl, publicId, session.uid],
    );

    if (result.rowCount !== 1) {
      return errorResponse("User account not found.", 404);
    }

    const oldPublicId = result.rows[0].old_public_id;

    if (oldPublicId && oldPublicId !== publicId) {
      after(() => destroyProfileImage(oldPublicId, session.uid));
    }

    return jsonResponse({
      success: true,
      message: "Profile image updated successfully.",
      imageUrl,
    });
  } catch (error) {
    return handleRouteError(error, "Profile image update error");
  }
}
