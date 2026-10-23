"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Refresh, Trash, X } from "@mynaui/icons-react";

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

// Response from /api/cloudinary/sign
interface SignData {
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  apiKey: string;
  cloudName: string;
}

// Cloudinary upload response
interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Validate the signed upload data returned by the server.
function isSignData(
  data: Record<string, unknown>,
): data is Record<string, unknown> & SignData {
  return (
    typeof data.signature === "string" &&
    typeof data.timestamp === "number" &&
    typeof data.folder === "string" &&
    typeof data.publicId === "string" &&
    typeof data.apiKey === "string" &&
    typeof data.cloudName === "string"
  );
}

// View, crop, update, or remove the profile image.
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

  // Release local preview URLs whenever they are replaced or the modal unmounts.
  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
    };
  }, [draftUrl]);

  function handleClose() {
    if (!loading) onClose();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";
    if (!file) return;

    setError("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please select a PNG, JPEG or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image size must be 10 MB or less.");
      return;
    }

    setDraftUrl(URL.createObjectURL(file));
  }

  // Crop the selected image, upload it to Cloudinary, and save its URL.
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

  // Remove the current profile image.
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-image-title"
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-[#2A2C32] bg-[#17181C] p-5 text-[#EAEAEA] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute right-3 top-3 cursor-pointer rounded-lg p-2 text-[#787878] transition hover:bg-[#2A2C32] hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-50 sm:right-5 sm:top-5"
        >
          <X size={20} />
        </button>

        <div className="mb-6 px-8 text-center sm:mb-7 sm:px-10">
          <h2
            id="profile-image-title"
            className="text-lg font-semibold sm:text-xl"
          >
            {isEditing ? "Adjust your photo" : "Profile picture"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#787878]">
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
            <div className="relative h-56 w-56 shrink-0 overflow-hidden rounded-full border border-[#2A2C32] bg-[#0E0F12] shadow-lg sm:h-72 sm:w-72 md:h-80 md:w-80">
              <Avatar
                url={imageSrc}
                name={username}
                letterClassName="text-6xl text-[#60A5FA] sm:text-7xl"
                sizes="(min-width: 768px) 320px, (min-width: 640px) 288px, 224px"
              />
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm leading-relaxed text-rose-400"
          >
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
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
              className="flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={18} />
              {loading ? "Saving..." : "Save Image"}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2A2C32] px-4 py-3 text-sm text-[#A1A1AA] transition hover:bg-[#0E0F12] hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full min-w-0 flex-1 cursor-pointer rounded-xl border border-[#2A2C32] px-4 py-3 text-sm text-[#A1A1AA] transition hover:bg-[#0E0F12] hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {imageSrc ? <Refresh size={18} /> : <Camera size={18} />}
              {imageSrc ? "Change Image" : "Add Image"}
            </button>

            {imageSrc && (
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={loading}
                className="flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash size={18} />
                {loading ? "Removing..." : "Remove Image"}
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full min-w-0 flex-1 cursor-pointer rounded-xl border border-[#2A2C32] px-4 py-3 text-sm text-[#A1A1AA] transition hover:bg-[#0E0F12] hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-relaxed text-[#787878]">
          PNG, JPEG or WebP · Maximum size 10 MB
        </p>
      </section>
    </div>
  );
}
