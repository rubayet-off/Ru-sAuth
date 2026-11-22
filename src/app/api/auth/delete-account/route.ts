import { after, type NextRequest } from "next/server";

import pool from "@/database/pool";
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

/*
 * Permanent account deletion
 *
 * 1. The profile photo is deleted from Cloudinary first. If that fails the
 *    account is left untouched and the user can try again, so a photo is
 *    never orphaned on Cloudinary.
 * 2. The user row is deleted. ON DELETE CASCADE removes the user's sessions,
 *    OTP codes and password grants in the same statement, so every device is
 *    signed out at once. Nothing about the user is kept.
 */
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

    const accountResult = await pool.query<AccountRow>(
      `
        SELECT uid, profile_image_public_id
        FROM users
        WHERE uid = $1 AND is_verified = TRUE
        LIMIT 1
      `,
      [session.uid],
    );

    const account = accountResult.rows[0];

    if (!account) {
      return errorResponse("Your session or account is no longer active.", 401);
    }

    // Step 1: the photo. Done outside the transaction so no row lock is held
    // while waiting on Cloudinary.
    if (account.profile_image_public_id) {
      const removed = await destroyProfileImage(
        account.profile_image_public_id,
        account.uid,
      );

      if (!removed) {
        return errorResponse(
          "We couldn't remove your profile photo right now, so your account was not deleted. Please try again.",
          502,
        );
      }
    }

    // Step 2: the account itself.
    const deleted = await withTransaction(async (client) => {
      const result = await client.query<{
        profile_image_public_id: string | null;
      }>(
        `
          DELETE FROM users
          WHERE uid = $1
          RETURNING profile_image_public_id
        `,
        [account.uid],
      );

      if (result.rowCount !== 1) {
        throw new ApiError("Your session or account is no longer active.", 401);
      }

      return result.rows[0];
    });

    // A new photo uploaded between step 1 and step 2 would still be on
    // Cloudinary: remove it too.
    const lateUpload = deleted.profile_image_public_id;

    if (lateUpload && lateUpload !== account.profile_image_public_id) {
      after(() => destroyProfileImage(lateUpload, account.uid));
    }

    const response = jsonResponse({
      success: true,
      message: "Your account and all of its data have been permanently deleted.",
      redirect: "/",
    });

    clearAllAuthCookies(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Delete-account error");
  }
}
