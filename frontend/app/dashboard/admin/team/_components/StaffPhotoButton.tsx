"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "../../../../../lib/imageCompression";
import { uploadStaffPhoto, type StaffMember } from "../../../../../lib/adminAccess";
import { UserAvatar } from "../../users/_components/userActions";

// Matches the backend photo upload (Cloudinary crops it to 500x500)
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * The staff member's photo. Clicking the camera picks a file, shrinks it in the
 * browser and uploads it; the photo then shows on the public team page.
 */
export function StaffPhotoButton({
  member,
  onUploaded,
  size = "md",
}: {
  member: StaffMember;
  onUploaded: (member: StaffMember) => void;
  size?: "md" | "lg";
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    setIsUploading(true);
    try {
      const { file: compressed } = await compressImage(file, { maxWidth: 1000, maxHeight: 1000 });
      if (compressed.size > PHOTO_MAX_BYTES) {
        toast.error("The photo must be 5 MB or smaller.");
        return;
      }
      const { data } = await uploadStaffPhoto(member._id, compressed);
      onUploaded(data);
      toast.success(`${member.name}'s photo was updated`);
    } catch (error) {
      toast.error(errorText(error, "The photo could not be uploaded"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <UserAvatar name={member.name} imageUrl={member.profileImageUrl} size={size} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        title="Change photo"
        aria-label={`Change the photo of ${member.name}`}
        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant bg-surface text-on-surface-variant shadow-sm transition-colors hover:text-on-surface disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          void pickPhoto(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
