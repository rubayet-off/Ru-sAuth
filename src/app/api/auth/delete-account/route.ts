import { after, type NextRequest } from "next/server";

import { withTransaction } from "@/database/transaction";
import {
  ApiError,
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { destroyProfileImage } from "@/lib/cloudinary";
import { clearAllAuthCookies } from "@/lib/cookies";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";

interface AccountRow {
  uid: string;
  profile_image_public_id: string | null;
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const session = await requireActiveUserSession(request);

    if (!session) {
      return errorResponse(
        "Your session has expired. Please sign in again.",
        401,
      );
    }
    const body = await readJsonBody(request);

    if (body?.confirm !== true) {
      return errorResponse("Please confirm the account deletion.", 400);
    }

    const account = await withTransaction(async (client) => {
      const result = await client.query<AccountRow>(
        `
          SELECT uid, profile_image_public_id
          FROM users
          WHERE uid = $1
            AND is_account_deleted = FALSE
            AND is_verified = TRUE
          FOR UPDATE
        `,
        [session.uid],
      );

      const row = result.rows[0];

      if (!row) {
        throw new ApiError("Your session or account is no longer active.", 401);
      }
      await client.query(
        `
          UPDATE users
          SET is_account_deleted = TRUE,
              deleted_at = NOW(),
              username = $2,
              email = $3,
              password_hash = NULL,
              google_id = NULL,
              profile_image_public_url = NULL,
              profile_image_public_id = NULL
          WHERE uid = $1
        `,
        [
          row.uid,
          `deleted_${row.uid.replace(/-/g, "").slice(0, 22)}`,
          `deleted+${row.uid}@deleted.invalid`,
        ],
      );
      await client.query(
        `
          UPDATE sessions
          SET is_revoked = TRUE, revoked_at = COALESCE(revoked_at, NOW())
          WHERE user_id = $1 AND is_revoked = FALSE
        `,
        [row.uid],
      );

      await client.query(`DELETE FROM otp_tokens WHERE user_id = $1`, [
        row.uid,
      ]);

      return row;
    });
    if (account.profile_image_public_id) {
      const publicId = account.profile_image_public_id;

      after(() => destroyProfileImage(publicId, account.uid));
    }

    const response = jsonResponse({
      success: true,
      message: "Your account has been deleted.",
      redirect: "/",
    });

    clearAllAuthCookies(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Delete-account error");
  }
}
