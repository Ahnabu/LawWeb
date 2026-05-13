"use client";

/*
  Lawyer profile page now supports bilingual display in English and Bengali.
  It shows profile designation, biography, education, certifications, and other
  lawyer details according to the current language toggle.
*/

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Scale, MapPin, Phone, Mail, Calendar, BookOpen } from "lucide-react";
import { Footer } from "../../../components/Footer";
import { Navbar } from "../../../components/Navbar";
import { WhatsAppCta } from "../../../components/WhatsAppCta";
import { useLanguage } from "../../../components/LanguageProvider";
import { API_BASE_URL } from "../../../lib/api";

interface LawyerUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  barId?: string;
  specialization?: string;
  isVerified: boolean;
  role: string;
  createdAt: string;
}

interface LawyerProfileData {
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  designation: { en: string; bn: string };
  bio: { en: string; bn: string };
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  practiceAreas: string[];
  languages: string[];
  education: { degree: string; institution: string; year: number; description?: { en: string; bn: string } }[];
  certifications: { name: string; issuingBody: string; year: number; description?: { en: string; bn: string } }[];
  hourlyRate?: number;
  yearAdmitted?: number;
}

export default function LawyerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLanguage();
  const [lawyer, setLawyer] = useState<LawyerUser | null>(null);
  const [profile, setProfile] = useState<LawyerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/api/lawyers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.lawyer) { setNotFound(true); return; }
        setLawyer(data.lawyer);
        setProfile(data.profile || null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const initials = lawyer
    ? lawyer.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const whatsappNumber = profile?.whatsappNumber || "8801715365380";

  // Get bilingual content based on current locale
  const designation = profile?.designation?.[locale] || profile?.designation?.en || "Attorney at Law";
  const bio = profile?.bio?.[locale] || profile?.bio?.en || "";

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface text-on-surface">
        <Navbar />
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="h-96 animate-pulse rounded-2xl bg-surface-container" />
              <div className="space-y-4">
                <div className="h-8 w-2/3 animate-pulse rounded bg-surface-container" />
                <div className="h-40 animate-pulse rounded-2xl bg-surface-container" />
                <div className="h-40 animate-pulse rounded-2xl bg-surface-container" />
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  if (notFound || !lawyer) {
    return (
      <main className="min-h-screen bg-surface text-on-surface">
        <Navbar />
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-outline-variant bg-surface-container p-10 text-center">
            <h1 className="font-display text-2xl font-semibold text-on-surface">Lawyer not found</h1>
            <p className="mt-3 text-sm text-on-surface-variant">
              The profile you are looking for does not exist or is no longer available.
            </p>
            <Link
              href="/lawyers"
              className="mt-6 inline-flex rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-primary transition hover:opacity-90"
            >
              Back to Lawyers
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const practiceAreas = profile?.practiceAreas?.length
    ? profile.practiceAreas
    : lawyer.specialization
    ? lawyer.specialization.split(",").map((s) => s.trim())
    : [];

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/lawyers" className="hover:text-primary transition-colors">
              Our Lawyers
            </Link>
            <span>/</span>
            <span className="text-on-surface">{lawyer.name}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {/* Sidebar */}
            <aside className="space-y-5">
              {/* Photo + name */}
              <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 text-center shadow-sm">
                {profile?.profileImageUrl ? (
                  <Image
                    src={profile.profileImageUrl}
                    alt={lawyer.name}
                    width={144}
                    height={144}
                    className="mx-auto h-36 w-36 rounded-full object-cover ring-4 ring-secondary/20"
                  />
                ) : (
                  <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary ring-4 ring-secondary/20">
                    {initials}
                  </div>
                )}
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  {designation}
                </p>
                <h1 className="mt-2 font-display text-xl font-semibold text-on-surface">
                  {lawyer.name}
                </h1>
                {lawyer.barId && (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Bar ID: {lawyer.barId}
                  </p>
                )}
                {profile?.yearAdmitted && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Admitted: {profile.yearAdmitted}
                  </p>
                )}
              </div>

              {/* CTA */}
              <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container p-5">
                <Link
                  href="/dashboard/client/book-consultation"
                  className="block w-full rounded-full bg-secondary py-3 text-center text-sm font-semibold text-primary transition hover:opacity-90"
                >
                  Book Appointment
                </Link>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-full border border-outline-variant bg-surface py-3 text-center text-sm font-semibold text-on-surface transition hover:border-secondary hover:text-secondary"
                >
                  WhatsApp Quick Link
                </a>
              </div>

              {/* Contact */}
              {(profile?.contactEmail || profile?.contactPhone || lawyer.phone) && (
                <div className="rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Contact</p>
                  {(profile?.contactEmail || lawyer.email) && (
                    <a
                      href={`mailto:${profile?.contactEmail || lawyer.email}`}
                      className="flex items-center gap-2 text-sm text-on-surface hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4 text-secondary shrink-0" />
                      {profile?.contactEmail || lawyer.email}
                    </a>
                  )}
                  {(profile?.contactPhone || lawyer.phone) && (
                    <a
                      href={`tel:${profile?.contactPhone || lawyer.phone}`}
                      className="flex items-center gap-2 text-sm text-on-surface hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 text-secondary shrink-0" />
                      {profile?.contactPhone || lawyer.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Practice areas chips */}
              {practiceAreas.length > 0 && (
                <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Practice Areas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {practiceAreas.map((area) => (
                      <span
                        key={area}
                        className="rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly rate */}
              {profile?.hourlyRate && (
                <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Consultation Fee
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-secondary">
                    ৳{profile.hourlyRate.toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-on-surface-variant">/hr</span>
                  </p>
                </div>
              )}
            </aside>

            {/* Main content */}
            <div className="space-y-6">
              {/* Bio */}
              {bio && (
                <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-sm">
                  <h2 className="font-display text-lg font-semibold text-on-surface">
                    Biography
                  </h2>
                  <p className="mt-3 leading-7 text-on-surface-variant">{bio}</p>
                </div>
              )}

              {/* Education & Certifications */}
              {(profile?.education?.length || profile?.certifications?.length) ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {profile?.education?.length ? (
                    <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-secondary" />
                        <h3 className="font-display text-base font-semibold text-on-surface">
                          Education
                        </h3>
                      </div>
                      <ul className="space-y-3">
                        {profile.education.map((edu, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium text-on-surface">{edu.degree}</p>
                            <p className="text-on-surface-variant">{edu.institution}, {edu.year}</p>
                            {edu.description?.[locale] && (
                              <p className="mt-1 text-xs text-on-surface-variant">{edu.description[locale]}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {profile?.certifications?.length ? (
                    <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-secondary" />
                        <h3 className="font-display text-base font-semibold text-on-surface">
                          Certifications
                        </h3>
                      </div>
                      <ul className="space-y-3">
                        {profile.certifications.map((cert, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium text-on-surface">{cert.name}</p>
                            <p className="text-on-surface-variant">{cert.issuingBody}, {cert.year}</p>
                            {cert.description?.[locale] && (
                              <p className="mt-1 text-xs text-on-surface-variant">{cert.description[locale]}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Languages */}
              {profile?.languages?.length ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <h3 className="font-display text-base font-semibold text-on-surface">
                      Languages
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-full border border-outline-variant bg-surface px-3 py-1 text-sm text-on-surface"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Firm info */}
              <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-sm">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Scale className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-medium">Islam &amp; Associates</span>
                </div>
                <p className="mt-3 text-sm text-on-surface-variant">
                  A member of Islam &amp; Associates — dedicated to providing expert legal counsel across a wide range of practice areas.
                </p>
              </div>

              {/* Book CTA */}
              <div className="rounded-2xl bg-primary p-8 text-center shadow-sm">
                <h2 className="font-display text-xl font-semibold text-on-primary">
                  Book an Appointment with {lawyer.name}
                </h2>
                <p className="mt-2 text-sm text-on-primary/70">
                  Choose a convenient time for your consultation.
                </p>
                <Link
                  href="/dashboard/client/book-consultation"
                  className="mt-5 inline-flex rounded-full bg-secondary px-8 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
                >
                  Book Appointment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}



