"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Save, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../components/AuthProvider";
import { API_BASE_URL } from "../../../../lib/api";
import { SecuritySettingsCard } from "../../../../components/SecuritySettingsCard";
import { apiFetch } from "../../../../lib/http";

export default function ClientProfilePage() {
  const { user, refreshSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const profileImageUrl = user?.profileImageUrl;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setIsSaving(true);
    const toastId = toast.loading("Saving profile...");
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, phone: form.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      await refreshSession();
      toast.success("Profile updated successfully.", { id: toastId });
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed", {
        id: toastId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading("Uploading photo...");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch(`${API_BASE_URL}/api/users/me/profile-image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      await refreshSession();
      toast.success("Photo updated successfully.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", {
        id: toastId,
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-2xl font-semibold text-heading">
          My Profile
        </h3>
        <p className="text-sm text-on-surface-variant">
          Manage your account details and preferences.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Photo card */}
        <section className="card flex flex-col items-center gap-4 p-6">
          <div className="relative">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt="Profile"
                width={112}
                height={112}
                className="h-28 w-28 rounded-full border border-outline-variant object-cover shadow-[0_1px_2px_rgb(16_24_40/0.12)]"
              />
            ) : (
              <div className="monogram h-28 w-28">
                <User className="h-12 w-12 text-outline" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="btn btn-primary absolute bottom-0 right-0 h-8 min-h-8 w-8 rounded-full p-0"
              aria-label="Change profile photo"
              title="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Upload profile photo"
            className="hidden"
            onChange={handleImageChange}
          />
          <div className="text-center">
            <p className="font-semibold text-on-surface">{user?.name}</p>
            <p className="text-xs text-on-surface-variant capitalize">
              {user?.role}
            </p>
          </div>
          <p className="text-center text-xs text-on-surface-variant">
            JPG, PNG, WebP — max 5 MB
          </p>
        </section>

        {/* Account details */}
        <section className="card space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">
              Account Details
            </h3>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setForm({ name: user?.name || "", phone: user?.phone || "" });
                  setIsEditing(true);
                }}
                className="btn btn-secondary btn-sm"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="label">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="field"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="label">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="field"
                  placeholder="+880..."
                />
              </div>
              <div>
                <label
                  htmlFor="profile-email"
                  className="label"
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="field cursor-not-allowed opacity-60"
                />
                <p className="mt-1 text-xs text-on-surface-variant">
                  Email cannot be changed.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Full Name" value={user?.name || "—"} />
              <InfoField label="Email" value={user?.email || "—"} />
              <InfoField label="Phone" value={user?.phone || "—"} />
              <InfoField label="Role" value={user?.role || "client"} />
              <InfoField
                label="Account Status"
                value={user?.isVerified ? "Verified" : "Unverified"}
              />
            </div>
          )}
        </section>
      </div>

      <SecuritySettingsCard />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 font-medium text-on-surface capitalize">{value}</p>
    </div>
  );
}
