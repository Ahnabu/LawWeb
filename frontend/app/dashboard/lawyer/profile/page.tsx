"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, X, Pencil, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  LawyerProfileData,
  Education,
  Certification,
  getMyLawyerProfile,
  updateMyLawyerProfile,
} from "../../../../lib/dashboard";
import { API_BASE_URL } from "../../../../lib/api";

const PRACTICE_AREA_OPTIONS = [
  "Civil Law", "Criminal Law", "Corporate Law", "Family Law",
  "Immigration", "Real Estate", "Labor Law", "Tax Law",
  "Constitutional Law", "Environmental Law", "Intellectual Property",
  "Banking & Finance",
];

const LANGUAGE_OPTIONS = ["Bengali", "English", "Arabic", "Hindi", "Urdu"];

const emptyProfile: LawyerProfileData = {
  firstName: "",
  lastName: "",
  profileImageUrl: "",
  designation: { en: "", bn: "" },
  bio: { en: "", bn: "" },
  contactEmail: "",
  contactPhone: "",
  whatsappNumber: "",
  barNumber: "",
  yearAdmitted: undefined,
  practiceAreas: [],
  languages: [],
  education: [],
  certifications: [],
  hourlyRate: undefined,
  isActive: true,
};

export default function LawyerProfilePage() {
  const [profile, setProfile] = useState<LawyerProfileData>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temp state for array item adds
  const [newEdu, setNewEdu] = useState<Education>({ degree: "", institution: "", year: new Date().getFullYear() });
  const [newCert, setNewCert] = useState<Certification>({ name: "", issuingBody: "", year: new Date().getFullYear() });

  useEffect(() => {
    getMyLawyerProfile()
      .then((data) => setProfile(data))
      .catch((err) => toast.error(err.message || "Failed to load profile"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    setImagePreview(URL.createObjectURL(file));
    setIsUploadingImage(true);
    const toastId = toast.loading("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_BASE_URL}/api/lawyers/me/profile/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setProfile((p) => ({ ...p, profileImageUrl: data.data.profileImageUrl }));
      setImagePreview(null);
      toast.success("Profile image updated.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed", { id: toastId });
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Saving profile...");
    try {
      const updated = await updateMyLawyerProfile(profile);
      setProfile(updated);
      toast.success("Profile updated successfully.", { id: toastId });
      setEditMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArea = (area: string) => {
    setProfile((p) => ({
      ...p,
      practiceAreas: p.practiceAreas.includes(area)
        ? p.practiceAreas.filter((a) => a !== area)
        : [...p.practiceAreas, area],
    }));
  };

  const toggleLanguage = (lang: string) => {
    setProfile((p) => ({
      ...p,
      languages: p.languages.includes(lang)
        ? p.languages.filter((l) => l !== lang)
        : [...p.languages, lang],
    }));
  };

  const addEducation = () => {
    if (!newEdu.degree || !newEdu.institution) return;
    setProfile((p) => ({ ...p, education: [...p.education, newEdu] }));
    setNewEdu({ degree: "", institution: "", year: new Date().getFullYear() });
  };

  const removeEducation = (i: number) =>
    setProfile((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addCertification = () => {
    if (!newCert.name || !newCert.issuingBody) return;
    setProfile((p) => ({ ...p, certifications: [...p.certifications, newCert] }));
    setNewCert({ name: "", issuingBody: "", year: new Date().getFullYear() });
  };

  const removeCertification = (i: number) =>
    setProfile((p) => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }));

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-36 rounded bg-surface-container" />
        <div className="h-48 rounded-lg bg-surface-container" />
        <div className="h-48 rounded-lg bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            My Profile
          </h3>
          <p className="text-sm text-on-surface-variant">
            Manage your professional details and public presence.
          </p>
        </div>
        {!editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </header>

      {/* Profile image */}
      <section className="flex items-center gap-5 rounded-lg border border-outline-variant bg-surface-container p-5">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-outline-variant bg-surface">
            {(imagePreview || profile.profileImageUrl) ? (
              <Image
                src={imagePreview ?? profile.profileImageUrl!}
                alt="Profile"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-bold text-primary">
                {profile.firstName?.[0] || "?"}
              </div>
            )}
          </div>
          {isUploadingImage && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-on-surface">
            {profile.firstName || profile.lastName
              ? `${profile.firstName} ${profile.lastName}`.trim()
              : "Your Name"}
          </p>
          <p className="text-xs text-on-surface-variant">
            {profile.designation?.en || "Lawyer"}
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface transition-colors">
            <Camera className="h-3.5 w-3.5" />
            {isUploadingImage ? "Uploading..." : "Change Photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpg,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleImageChange}
              disabled={isUploadingImage}
            />
          </label>
        </div>
      </section>

      {/* Identity */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          Identity & Contact
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First Name"
            value={profile.firstName}
            edit={editMode}
            onChange={(v) => setProfile((p) => ({ ...p, firstName: v }))}
          />
          <Field
            label="Last Name"
            value={profile.lastName}
            edit={editMode}
            onChange={(v) => setProfile((p) => ({ ...p, lastName: v }))}
          />
          <Field
            label="Contact Email"
            type="email"
            value={profile.contactEmail || ""}
            edit={editMode}
            onChange={(v) => setProfile((p) => ({ ...p, contactEmail: v }))}
          />
          <Field
            label="Contact Phone"
            value={profile.contactPhone || ""}
            edit={editMode}
            onChange={(v) => setProfile((p) => ({ ...p, contactPhone: v }))}
          />
          <Field
            label="WhatsApp Number"
            value={profile.whatsappNumber || ""}
            edit={editMode}
            onChange={(v) => setProfile((p) => ({ ...p, whatsappNumber: v }))}
          />
        </div>
      </section>

      {/* Professional credentials */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          Professional Credentials
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Designation (English)"
            value={profile.designation.en}
            edit={editMode}
            onChange={(v) =>
              setProfile((p) => ({
                ...p,
                designation: { ...p.designation, en: v },
              }))
            }
          />
          <Field
            label="Designation (Bengali)"
            value={profile.designation.bn}
            edit={editMode}
            onChange={(v) =>
              setProfile((p) => ({
                ...p,
                designation: { ...p.designation, bn: v },
              }))
            }
          />
          <Field
            label="Bar Number"
            value={profile.barNumber || ""}
            edit={editMode}
            onChange={(v) => setProfile((p) => ({ ...p, barNumber: v }))}
          />
          <Field
            label="Year Admitted"
            type="number"
            value={String(profile.yearAdmitted || "")}
            edit={editMode}
            onChange={(v) =>
              setProfile((p) => ({ ...p, yearAdmitted: v ? Number(v) : undefined }))
            }
          />
          <Field
            label="Hourly Rate (BDT)"
            type="number"
            value={String(profile.hourlyRate || "")}
            edit={editMode}
            onChange={(v) =>
              setProfile((p) => ({ ...p, hourlyRate: v ? Number(v) : undefined }))
            }
          />
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-on-surface-variant">
              Accepting new clients
            </span>
            {editMode ? (
              <input
                type="checkbox"
                title="Accepting new clients"
                checked={profile.isActive}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${profile.isActive ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}
              >
                {profile.isActive ? "Yes" : "No"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">Bio</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">
              English
            </label>
            {editMode ? (
              <textarea
                rows={4}
                value={profile.bio.en}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    bio: { ...p.bio, en: e.target.value },
                  }))
                }
                placeholder="Professional summary in English..."
                className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none"
              />
            ) : (
              <p className="text-sm text-on-surface-variant">
                {profile.bio.en || "—"}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">
              Bengali
            </label>
            {editMode ? (
              <textarea
                rows={4}
                value={profile.bio.bn}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    bio: { ...p.bio, bn: e.target.value },
                  }))
                }
                placeholder="বাংলায় পেশাদার সারসংক্ষেপ..."
                className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none"
              />
            ) : (
              <p className="text-sm text-on-surface-variant">
                {profile.bio.bn || "—"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Practice areas */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          Practice Areas
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRACTICE_AREA_OPTIONS.map((area) => {
            const active = profile.practiceAreas.includes(area);
            return (
              <button
                key={area}
                type="button"
                disabled={!editMode}
                onClick={() => editMode && toggleArea(area)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline text-on-surface-variant"
                } ${editMode ? "cursor-pointer hover:border-primary" : "cursor-default"}`}
              >
                {area}
              </button>
            );
          })}
        </div>
      </section>

      {/* Languages */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">Languages</h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = profile.languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                disabled={!editMode}
                onClick={() => editMode && toggleLanguage(lang)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-outline text-on-surface-variant"
                } ${editMode ? "cursor-pointer hover:border-secondary" : "cursor-default"}`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </section>

      {/* Education */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">Education</h3>
        <div className="space-y-2">
          {profile.education.map((edu, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-on-surface">{edu.degree}</p>
                <p className="text-xs text-on-surface-variant">
                  {edu.institution} · {edu.year}
                </p>
              </div>
              {editMode && (
                <button
                  type="button"
                  aria-label="Remove education"
                  onClick={() => removeEducation(i)}
                  className="ml-2 rounded-full p-1 text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {profile.education.length === 0 && (
            <p className="text-sm text-on-surface-variant">No education added yet.</p>
          )}
        </div>
        {editMode && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
            <input
              value={newEdu.degree}
              onChange={(e) => setNewEdu((n) => ({ ...n, degree: e.target.value }))}
              placeholder="Degree"
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              value={newEdu.institution}
              onChange={(e) => setNewEdu((n) => ({ ...n, institution: e.target.value }))}
              placeholder="Institution"
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              title="Year"
              value={newEdu.year}
              onChange={(e) => setNewEdu((n) => ({ ...n, year: Number(e.target.value) }))}
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={addEducation}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        )}
      </section>

      {/* Certifications */}
      <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          Certifications
        </h3>
        <div className="space-y-2">
          {profile.certifications.map((cert, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-on-surface">{cert.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {cert.issuingBody} · {cert.year}
                </p>
              </div>
              {editMode && (
                <button
                  type="button"
                  aria-label="Remove certification"
                  onClick={() => removeCertification(i)}
                  className="ml-2 rounded-full p-1 text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {profile.certifications.length === 0 && (
            <p className="text-sm text-on-surface-variant">No certifications added yet.</p>
          )}
        </div>
        {editMode && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
            <input
              value={newCert.name}
              onChange={(e) => setNewCert((n) => ({ ...n, name: e.target.value }))}
              placeholder="Certificate name"
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              value={newCert.issuingBody}
              onChange={(e) => setNewCert((n) => ({ ...n, issuingBody: e.target.value }))}
              placeholder="Issuing body"
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              title="Year"
              value={newCert.year}
              onChange={(e) => setNewCert((n) => ({ ...n, year: Number(e.target.value) }))}
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={addCertification}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  edit,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  edit: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-on-surface-variant">{label}</p>
      {edit ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
        />
      ) : (
        <p className="font-medium text-on-surface">{value || "—"}</p>
      )}
    </div>
  );
}
