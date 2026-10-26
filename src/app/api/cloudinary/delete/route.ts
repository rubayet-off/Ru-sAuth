import { after, type NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { destroyProfileImage } from "@/lib/cloudinary";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";

export async function DELETE(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Security check failed.", 403);
  }

  try {
    const session = await requireActiveUserSession(request);
    if (!session) return errorResponse("Unauthorized.", 401);

    const result = await pool.query<{ old_public_id: string | null }>(
      `
        WITH old AS (
          SELECT profile_image_public_id
          FROM users
          WHERE uid = $1 AND is_account_deleted = FALSE
          FOR UPDATE
        )
        UPDATE users
        SET profile_image_public_url = NULL,
            profile_image_public_id = NULL
        FROM old
        WHERE users.uid = $1 AND users.is_account_deleted = FALSE
        RETURNING old.profile_image_public_id AS old_public_id
      `,
      [session.uid],
    );

    if (result.rowCount !== 1) {
      return errorResponse("User account not found.", 404);
    }

    const oldPublicId = result.rows[0].old_public_id;

    if (oldPublicId) {
      after(() => destroyProfileImage(oldPublicId, session.uid));
    }

    return jsonResponse({
      success: true,
      message: "Profile image removed successfully.",
    });
  } catch (error) {
    return handleRouteError(error, "Profile image removal error");
  }
}
