"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Refresh, Trash } from "@mynaui/icons-react";

import { broadcastAuth } from "@/lib/authChannel";
import { apiRequest } from "@/lib/clientApi";
import { useAuthStore } from "@/zustand/authStore";

import Avatar from "./Avatar";
import ImageCropper, { type ImageCropperHandle } from "./ImageCropper";

interface ImageModalProps {
  imageSrc: string | null;
  username: string;
  onClose: () => void;
}

interface SignData {
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  allowedFormats: string;
  apiKey: string;
  cloudName: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

// Same button styles as the other dialogs (password and delete account).
const baseButtonClass =
  "flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const primaryButtonClass = `${baseButtonClass} border-[#0567E3] bg-[#0567E3] text-white hover:bg-transparent`;
const secondaryButtonClass = `${baseButtonClass} border-[#2d2f36] bg-[#11111B] text-gray-300 hover:border-gray-500 hover:text-white`;
const dangerButtonClass = `${baseButtonClass} border-[#691919] bg-[#691919]/20 hover:bg-transparent hover:text-white`;

// Only PNG, JPG and JPEG. The file type and the file extension must both
// match, so a renamed file of another type is rejected.
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"];
const ALLOWED_EXTENSIONS = /\.(png|jpe?g)$/i;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isSignData(
  data: Record<string, unknown>,
): data is Record<string, unknown> & SignData {
  return (
    typeof data.signature === "string" &&
    typeof data.timestamp === "number" &&
    typeof data.folder === "string" &&
    typeof data.publicId === "string" &&
    typeof data.allowedFormats === "string" &&
    typeof data.apiKey === "string" &&
    typeof data.cloudName === "string"
  );
}

export default function ImageModal({
  imageSrc,
  username,
  onClose,
}: ImageModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ImageCropperHandle>(null);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
    };
  }, [draftUrl]);

  function handleClose() {
    if (!loading) onClose();
  }

  // Escape closes the dialog, now that there is no close (X) icon.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onClose]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";
    if (!file) return;

    setError("");

    if (
      !ALLOWED_IMAGE_TYPES.includes(file.type) ||
      !ALLOWED_EXTENSIONS.test(file.name)
    ) {
      setError("Please select a PNG, JPG or JPEG image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image size must be 10 MB or less.");
      return;
    }

    setDraftUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!draftUrl || loading) return;

    setError("");
    setLoading(true);

    try {
      const blob = await cropperRef.current?.getCroppedBlob();
      if (!blob) throw new Error("Could not crop the image.");

      const sign = await apiRequest("/api/cloudinary/sign");
      if (!sign.ok || !isSignData(sign.data)) {
        throw new Error(sign.message || "Could not prepare the image upload.");
      }

      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");
      formData.append("api_key", sign.data.apiKey);
      formData.append("timestamp", String(sign.data.timestamp));
      formData.append("folder", sign.data.folder);
      formData.append("public_id", sign.data.publicId);
      formData.append("allowed_formats", sign.data.allowedFormats);
      formData.append("signature", sign.data.signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.data.cloudName)}/image/upload`,
        { method: "POST", body: formData },
      );

      const upload: CloudinaryUploadResponse = await uploadResponse
        .json()
        .catch(() => ({}));

      if (!uploadResponse.ok || !upload.secure_url || !upload.public_id) {
        throw new Error(
          upload.error?.message || "Cloudinary image upload failed.",
        );
      }

      const saved = await apiRequest("/api/cloudinary/update", {
        body: { imageUrl: upload.secure_url, publicId: upload.public_id },
      });

      if (!saved.ok || saved.data.success !== true) {
        throw new Error(saved.message || "Could not save the profile image.");
      }

      updateUser({ profile_photo_url: upload.secure_url });
      broadcastAuth({ type: "profile", profile_photo_url: upload.secure_url });

      setLoading(false);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating your image.",
      );
      setLoading(false);
    }
  }

  async function handleRemoveImage() {
    if (!imageSrc || loading) return;

    setError("");
    setLoading(true);

    const result = await apiRequest("/api/cloudinary/delete", {
      method: "DELETE",
    });

    if (!result.ok || result.data.success !== true) {
      setError(result.message || "Could not remove the profile image.");
      setLoading(false);
      return;
    }

    updateUser({ profile_photo_url: null });
    broadcastAuth({ type: "profile", profile_photo_url: null });
    setLoading(false);
  }

  const isEditing = draftUrl !== null;

  return (
    <div
      className="fixed inset-0 z-110 flex items-start justify-center overflow-y-auto bg-[#11111B]/93 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-image-title"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto overscroll-contain border border-[#2d2f36] bg-[#14141d] p-6 text-[#FBFDFC] shadow-2xl sm:p-8"
      >
        <div className="mb-6 text-center sm:mb-7">
          <h2
            id="profile-image-title"
            className="text-lg font-semibold"
          >
            {isEditing ? "Adjust your photo" : "Profile picture"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#A7B8C2]">
            {isEditing
              ? "Drag and zoom to choose the part of the photo to show."
              : "Manage your Ru'sAuth profile image."}
          </p>
        </div>

        {isEditing ? (
          <div className="mx-auto mb-6 w-full max-w-2xl sm:mb-7">
            <ImageCropper ref={cropperRef} src={draftUrl} disabled={loading} />
          </div>
        ) : (
          <div className="mx-auto mb-6 flex w-full justify-center sm:mb-7">
            <div className="relative h-56 w-56 shrink-0 overflow-hidden rounded-full border border-[#2d2f36] bg-[#11111B] sm:h-72 sm:w-72 md:h-80 md:w-80">
              <Avatar
                url={imageSrc}
                name={username}
                letterClassName="text-8xl text-[#0567E3] sm:text-9xl md:text-[10rem]"
                sizes="(min-width: 768px) 320px, (min-width: 640px) 288px, 224px"
              />
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mb-5 border border-[#691919] bg-[#691919]/20 px-3 py-2.5 text-center text-sm leading-relaxed text-rose-300"
          >
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />

        {isEditing ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className={primaryButtonClass}
            >
              <Check size={18} />
              {loading ? "Saving..." : "Save Image"}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={secondaryButtonClass}
            >
              <Refresh size={18} />
              Choose another
            </button>

            <button
              type="button"
              onClick={() => {
                setDraftUrl(null);
                setError("");
              }}
              disabled={loading}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={primaryButtonClass}
            >
              {imageSrc ? <Refresh size={18} /> : <Camera size={18} />}
              {imageSrc ? "Change Image" : "Add Image"}
            </button>

            {imageSrc && (
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={loading}
                className={dangerButtonClass}
              >
                <Trash size={18} />
                {loading ? "Removing..." : "Remove Image"}
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-relaxed text-[#A7B8C2]">
          PNG, JPG or JPEG · Maximum size 10 MB
        </p>
      </section>
    </div>
  );
}
