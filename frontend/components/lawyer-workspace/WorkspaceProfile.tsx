"use client";

import {
  getWorkspaceProfile,
  updateWorkspaceProfile,
  uploadWorkspaceProfileImage,
  type WorkspaceLawyerId,
} from "../../lib/workspace";
import { useWorkspace } from "./useWorkspace";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, X, Pencil, Camera, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  LawyerProfileData,
  Education,
  Certification,
} from "../../lib/dashboard";
import { SecuritySettingsCard } from "../SecuritySettingsCard";
import { RichTextEditor } from "../RichTextEditor";
import { RichText } from "../RichText";
import { BIO_MAX as BIO_MAX_LENGTH } from "../../lib/richText";

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
  consultationFee: { bdt: null, usd: null },
  isActive: true,
};

export function WorkspaceProfile({ lawyerId }: { lawyerId: WorkspaceLawyerId }) {
  const workspace = useWorkspace(lawyerId);
  const [profile, setProfile] = useState<LawyerProfileData>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    professional: true,
    bio: true,
    practice: false,
    education: false,
    certifications: false,
    languages: false,
    contact: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temp state for array item adds
  const [newEdu, setNewEdu] = useState<Education>({ 
    degree: "", 
    institution: "", 
    year: new Date().getFullYear(),
    description: { en: "", bn: "" } as { en: string; bn: string }
  });
  const [newCert, setNewCert] = useState<Certification>({ 
    name: "", 
    issuingBody: "", 
    year: new Date().getFullYear(),
    description: { en: "", bn: "" } as { en: string; bn: string }
  });

  useEffect(() => {
    getWorkspaceProfile(lawyerId)
      .then((data) => setProfile(data))
      .catch((err) => toast.error(err.message || "Failed to load profile"))
      .finally(() => setIsLoading(false));
  }, [lawyerId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setIsUploadingImage(true);
    const toastId = toast.loading("Uploading image...");

    try {
      const profileImageUrl = await uploadWorkspaceProfileImage(lawyerId, file);
      setProfile((p) => ({ ...p, profileImageUrl }));
      setImagePreview(null);
      toast.success("Profile image updated.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed", { id: toastId });
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Saving profile...");
    try {
      const updated = await updateWorkspaceProfile(lawyerId, profile);
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
    setNewEdu({ degree: "", institution: "", year: new Date().getFullYear(), description: { en: "", bn: "" } as { en: string; bn: string } });
  };

  const removeEducation = (i: number) =>
    setProfile((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addCertification = () => {
    if (!newCert.name || !newCert.issuingBody) return;
    setProfile((p) => ({ ...p, certifications: [...p.certifications, newCert] }));
    setNewCert({ name: "", issuingBody: "", year: new Date().getFullYear(), description: { en: "", bn: "" } as { en: string; bn: string } });
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
          <h3 className="font-display text-2xl font-semibold text-heading">
            {workspace.isOwn ? "My Profile" : "Public Profile"}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {workspace.isOwn
              ? "Manage your professional details and public presence."
              : `${workspace.lawyerName ?? "The lawyer"}'s professional details and public presence.`}
          </p>
        </div>
        {!editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="btn btn-secondary"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="btn btn-primary"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </header>

      {/* Profile image */}
      <section className="card flex items-center gap-5 p-5">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-outline-variant bg-surface-raised">
            {(imagePreview || profile.profileImageUrl) ? (
              <Image
                src={imagePreview ?? profile.profileImageUrl!}
                alt="Profile"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="monogram h-full w-full rounded-none border-0 text-2xl">
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
          <label className="btn btn-secondary btn-sm cursor-pointer">
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

      {/* SECTION 1: Basic Information */}
      <CollapsibleSection
        title="Basic Information"
        expanded={expandedSections.basic}
        onToggle={() => toggleSection("basic")}
      >
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
        </div>
      </CollapsibleSection>

      {/* SECTION 2: Professional Credentials */}
      <CollapsibleSection
        title="Professional Credentials"
        expanded={expandedSections.professional}
        onToggle={() => toggleSection("professional")}
      >
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
          {(["bdt", "usd"] as const).map((currency) => (
            <Field
              key={currency}
              label={currency === "bdt" ? "Consultation Fee (৳ BDT)" : "Consultation Fee ($ USD)"}
              type="number"
              value={profile.consultationFee?.[currency] != null ? String(profile.consultationFee[currency]) : ""}
              edit={editMode}
              onChange={(v) =>
                setProfile((p) => ({
                  ...p,
                  consultationFee: { bdt: null, usd: null, ...p.consultationFee, [currency]: v === "" ? null : Number(v) },
                }))
              }
            />
          ))}
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
                className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold ${profile.isActive ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}
              >
                {profile.isActive ? "Yes" : "No"}
              </span>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* SECTION 3: Biography */}
      <CollapsibleSection
        title="Biography"
        expanded={expandedSections.bio}
        onToggle={() => toggleSection("bio")}
      >
        <div className="space-y-3">
          <div>
            <p id="bio-en-label" className="label">
              English
            </p>
            {editMode ? (
              <RichTextEditor
                ariaLabelledBy="bio-en-label"
                value={profile.bio.en}
                onChange={(html) =>
                  setProfile((p) => ({
                    ...p,
                    bio: { ...p.bio, en: html },
                  }))
                }
                maxLength={BIO_MAX_LENGTH}
                placeholder="Professional summary in English..."
              />
            ) : (
              <RichText
                value={profile.bio.en}
                fallback={<p className="text-sm text-on-surface-variant">—</p>}
              />
            )}
          </div>
          <div>
            <p id="bio-bn-label" className="label">
              Bengali
            </p>
            {editMode ? (
              <RichTextEditor
                ariaLabelledBy="bio-bn-label"
                lang="bn"
                value={profile.bio.bn}
                onChange={(html) =>
                  setProfile((p) => ({
                    ...p,
                    bio: { ...p.bio, bn: html },
                  }))
                }
                maxLength={BIO_MAX_LENGTH}
                placeholder="বাংলায় পেশাদার সারসংক্ষেপ..."
              />
            ) : (
              <RichText
                lang="bn"
                value={profile.bio.bn}
                fallback={<p className="text-sm text-on-surface-variant">—</p>}
              />
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* SECTION 4: Practice Areas */}
      <CollapsibleSection
        title="Practice Areas"
        expanded={expandedSections.practice}
        onToggle={() => toggleSection("practice")}
      >
        <div className="flex flex-wrap gap-2">
          {PRACTICE_AREA_OPTIONS.map((area) => {
            const active = profile.practiceAreas.includes(area);
            return (
              <button
                key={area}
                type="button"
                disabled={!editMode}
                onClick={() => editMode && toggleArea(area)}
                className={`chip transition-colors ${
                  active
                    ? "chip-active"
                    : ""
                } ${editMode ? "cursor-pointer hover:border-outline" : "cursor-default"}`}
              >
                {area}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* SECTION 5: Education */}
      <CollapsibleSection
        title="Education"
        expanded={expandedSections.education}
        onToggle={() => toggleSection("education")}
      >
        <div className="space-y-2">
          {profile.education.map((edu, i) => (
            <div
              key={i}
              className="panel flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-on-surface">{edu.degree}</p>
                <p className="text-xs text-on-surface-variant">
                  {edu.institution} · {edu.year}
                </p>
                {edu.description?.en && (
                  <p className="mt-1 text-xs text-on-surface">{edu.description.en}</p>
                )}
              </div>
              {editMode && (
                <button
                  type="button"
                  aria-label="Remove education"
                  onClick={() => removeEducation(i)}
                  className="btn btn-ghost btn-icon ml-1 hover:text-error"
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
          <div className="mt-3 space-y-3 border-t border-outline-variant pt-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
              <input
                value={newEdu.degree}
                onChange={(e) => setNewEdu((n) => ({ ...n, degree: e.target.value }))}
                placeholder="Degree"
                className="field w-auto"
              />
              <input
                value={newEdu.institution}
                onChange={(e) => setNewEdu((n) => ({ ...n, institution: e.target.value }))}
                placeholder="Institution"
                className="field w-auto"
              />
              <input
                type="number"
                title="Year"
                value={newEdu.year}
                onChange={(e) => setNewEdu((n) => ({ ...n, year: Number(e.target.value) }))}
                className="field w-auto"
              />
              <button
                type="button"
                onClick={addEducation}
                className="btn btn-secondary"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={newEdu.description?.en || ""}
                onChange={(e) => setNewEdu((n) => ({ ...n, description: { en: e.target.value, bn: n.description?.bn || "" } }))}
                placeholder="Description (English) - optional"
                className="field w-auto"
              />
              <input
                value={newEdu.description?.bn || ""}
                onChange={(e) => setNewEdu((n) => ({ ...n, description: { en: n.description?.en || "", bn: e.target.value } }))}
                placeholder="বর্ণনা (বাংলা) - ঐচ্ছিক"
                className="field w-auto"
              />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* SECTION 6: Certifications */}
      <CollapsibleSection
        title="Certifications"
        expanded={expandedSections.certifications}
        onToggle={() => toggleSection("certifications")}
      >
        <div className="space-y-2">
          {profile.certifications.map((cert, i) => (
            <div
              key={i}
              className="panel flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-on-surface">{cert.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {cert.issuingBody} · {cert.year}
                </p>
                {cert.description?.en && (
                  <p className="mt-1 text-xs text-on-surface">{cert.description.en}</p>
                )}
              </div>
              {editMode && (
                <button
                  type="button"
                  aria-label="Remove certification"
                  onClick={() => removeCertification(i)}
                  className="btn btn-ghost btn-icon ml-1 hover:text-error"
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
          <div className="mt-3 space-y-3 border-t border-outline-variant pt-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
              <input
                value={newCert.name}
                onChange={(e) => setNewCert((n) => ({ ...n, name: e.target.value }))}
                placeholder="Certificate name"
                className="field w-auto"
              />
              <input
                value={newCert.issuingBody}
                onChange={(e) => setNewCert((n) => ({ ...n, issuingBody: e.target.value }))}
                placeholder="Issuing body"
                className="field w-auto"
              />
              <input
                type="number"
                title="Year"
                value={newCert.year}
                onChange={(e) => setNewCert((n) => ({ ...n, year: Number(e.target.value) }))}
                className="field w-auto"
              />
              <button
                type="button"
                onClick={addCertification}
                className="btn btn-secondary"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={newCert.description?.en || ""}
                onChange={(e) => setNewCert((n) => ({ ...n, description: { en: e.target.value, bn: n.description?.bn || "" } }))}
                placeholder="Description (English) - optional"
                className="field w-auto"
              />
              <input
                value={newCert.description?.bn || ""}
                onChange={(e) => setNewCert((n) => ({ ...n, description: { en: n.description?.en || "", bn: e.target.value } }))}
                placeholder="বর্ণনা (বাংলা) - ঐচ্ছিক"
                className="field w-auto"
              />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* SECTION 7: Languages */}
      <CollapsibleSection
        title="Languages"
        expanded={expandedSections.languages}
        onToggle={() => toggleSection("languages")}
      >
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = profile.languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                disabled={!editMode}
                onClick={() => editMode && toggleLanguage(lang)}
                className={`chip transition-colors ${
                  active
                    ? "chip-active"
                    : ""
                } ${editMode ? "cursor-pointer hover:border-outline" : "cursor-default"}`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* SECTION 8: Contact Information */}
      <CollapsibleSection
        title="Contact Information"
        expanded={expandedSections.contact}
        onToggle={() => toggleSection("contact")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
      </CollapsibleSection>

      {/* The signed-in account's own password and sessions: never shown for someone else's profile */}
      {workspace.isOwn && <SecuritySettingsCard />}
    </div>
  );
}

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 transition-colors hover:bg-surface-container"
      >
        <h3 className="text-sm font-semibold text-on-surface">
          {title}
        </h3>
        <ChevronDown
          className={`h-5 w-5 text-on-surface-variant transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="border-t border-outline-variant px-5 py-4">
          {children}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  type = "text",
  edit,
  onChange,
}: {
  label: string
  value: string
  type?: string
  edit: boolean
  onChange: (v: string) => void
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
          className="field"
        />
      ) : (
        <p className="font-medium text-on-surface">{value || "—"}</p>
      )}
    </div>
  );
}
