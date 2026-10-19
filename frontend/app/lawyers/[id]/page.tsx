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
import { MapPin, Phone, Mail, Calendar, BookOpen, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { Footer } from "../../../components/Footer";
import { Navbar } from "../../../components/Navbar";
import { WhatsAppCta } from "../../../components/WhatsAppCta";
import { useLanguage } from "../../../components/LanguageProvider";
import { API_BASE_URL } from "../../../lib/api";
import { useSiteSettings } from "../../../components/contentHooks";
import { RichText } from "../../../components/RichText";
import { isRichTextEmpty } from "../../../lib/richText";

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

interface DaySchedule {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface LawyerAvailabilityData {
  isAcceptingNewClients: boolean;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
}

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

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
  const siteSettings = useSiteSettings();
  const [lawyer, setLawyer] = useState<LawyerUser | null>(null);
  const [profile, setProfile] = useState<LawyerProfileData | null>(null);
  const [availability, setAvailability] = useState<LawyerAvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/lawyers/${id}`).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/lawyers/${id}/availability`).then((r) => r.json()),
    ])
      .then(([profileData, availData]) => {
        if (!profileData.lawyer) { setNotFound(true); return; }
        setLawyer(profileData.lawyer);
        setProfile(profileData.profile || null);
        setAvailability(availData.data || null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const initials = lawyer
    ? lawyer.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const whatsappNumber = profile?.whatsappNumber || siteSettings.whatsappNumber;

  // Get bilingual content based on current locale
  const designation = profile?.designation?.[locale] || profile?.designation?.en || "Attorney at Law";
  // Bios are rich text (HTML); fall back to English when the current locale has no visible text
  const localBio = profile?.bio?.[locale] || "";
  const bio = isRichTextEmpty(localBio) ? profile?.bio?.en || "" : localBio;
  const bioLang = bio === localBio ? locale : "en";

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface text-on-surface">
        <Navbar />
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="card h-96 animate-pulse" />
              <div className="space-y-4">
                <div className="h-8 w-2/3 animate-pulse rounded bg-surface-container" />
                <div className="card h-40 animate-pulse" />
                <div className="card h-40 animate-pulse" />
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
          <div className="card mx-auto max-w-2xl p-8 text-center sm:p-10">
            <h1 className="text-2xl text-heading">Lawyer not found</h1>
            <p className="mt-3 text-sm text-on-surface-variant">
              The profile you are looking for does not exist or is no longer available.
            </p>
            <Link
              href="/lawyers"
              className="btn btn-secondary mt-6"
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
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant">
            <Link href="/lawyers" className="underline-offset-4 transition-colors hover:text-on-surface hover:underline">
              Our Lawyers
            </Link>
            <span>/</span>
            <span className="text-on-surface" aria-current="page">{lawyer.name}</span>
          </nav>

          <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
            {/* Sidebar */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              {/* Photo + name */}
              <div className="card p-6 text-center">
                {profile?.profileImageUrl ? (
                  <Image
                    src={profile.profileImageUrl}
                    alt={lawyer.name}
                    width={144}
                    height={144}
                    className="mx-auto h-32 w-32 rounded-full border border-outline-variant object-cover shadow-[0_1px_2px_rgb(16_24_40/0.12)]"
                  />
                ) : (
                  <div className="monogram mx-auto h-32 w-32 text-4xl">
                    {initials}
                  </div>
                )}
                <h1 className="mt-4 text-xl text-heading">
                  {lawyer.name}
                </h1>
                <p className="mt-1 text-sm text-gold-ink">
                  {designation}
                </p>
                {lawyer.barId && (
                  <p className="mt-3 text-xs text-on-surface-variant">
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
              <div className="card space-y-2 p-4">
                {availability?.isAcceptingNewClients === false ? (
                  <div className="notice text-center text-on-surface-variant">
                    Not accepting new clients
                  </div>
                ) : (
                  <Link
                    href={`/appointment?lawyerId=${id}`}
                    className="btn btn-primary btn-block"
                  >
                    Book Appointment
                  </Link>
                )}
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-block"
                >
                  <MessageSquare className="h-4 w-4 text-[#1fae55]" aria-hidden="true" />
                  WhatsApp
                </a>
              </div>

              {/* Contact */}
              {(profile?.contactEmail || profile?.contactPhone || lawyer.phone) && (
                <div className="card space-y-2 p-5">
                  <h2 className="font-body text-sm font-semibold text-on-surface">Contact</h2>
                  {(profile?.contactEmail || lawyer.email) && (
                    <a
                      href={`mailto:${profile?.contactEmail || lawyer.email}`}
                      className="flex min-h-9 items-center gap-2 break-all text-sm text-on-surface underline-offset-4 hover:underline"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-gold-ink" />
                      {profile?.contactEmail || lawyer.email}
                    </a>
                  )}
                  {(profile?.contactPhone || lawyer.phone) && (
                    <a
                      href={`tel:${profile?.contactPhone || lawyer.phone}`}
                      className="flex min-h-9 items-center gap-2 break-all text-sm text-on-surface underline-offset-4 hover:underline"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-gold-ink" />
                      {profile?.contactPhone || lawyer.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Practice areas chips */}
              {practiceAreas.length > 0 && (
                <div className="card p-5">
                  <h2 className="mb-3 font-body text-sm font-semibold text-on-surface">
                    Practice Areas
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {practiceAreas.map((area) => (
                      <span
                        key={area}
                        className="chip"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly rate */}
              {profile?.hourlyRate && (
                <div className="card p-5">
                  <p className="text-sm text-on-surface-variant">
                    Consultation Fee
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-heading">
                    ৳{profile.hourlyRate.toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-on-surface-variant">/hr</span>
                  </p>
                </div>
              )}
            </aside>

            {/* Main content */}
            <div className="space-y-6">
              {/* Bio */}
              {!isRichTextEmpty(bio) && (
                <div className="card p-5 sm:p-6">
                  <h2 className="text-xl text-heading">
                    Biography
                  </h2>
                  <RichText value={bio} lang={bioLang} size="base" className="mt-3 max-w-prose" />
                </div>
              )}

              {/* Education & Certifications */}
              {(profile?.education?.length || profile?.certifications?.length) ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {profile?.education?.length ? (
                    <div className="card p-5 sm:p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                        <h3 className="text-base text-heading">
                          Education
                        </h3>
                      </div>
                      <ul className="divide-y divide-outline-variant">
                        {profile.education.map((edu, i) => (
                          <li key={i} className="py-3 text-sm first:pt-0 last:pb-0">
                            <p className="font-semibold text-on-surface">{edu.degree}</p>
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
                    <div className="card p-5 sm:p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                        <h3 className="text-base text-heading">
                          Certifications
                        </h3>
                      </div>
                      <ul className="divide-y divide-outline-variant">
                        {profile.certifications.map((cert, i) => (
                          <li key={i} className="py-3 text-sm first:pt-0 last:pb-0">
                            <p className="font-semibold text-on-surface">{cert.name}</p>
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
                <div className="card p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                    <h3 className="text-base text-heading">
                      Languages
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <span
                        key={lang}
                        className="chip text-on-surface"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Availability schedule */}
              {availability && (
                <div className="card p-5 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                      <h3 className="text-base text-heading">
                        Availability
                      </h3>
                    </div>
                    {availability.isAcceptingNewClients ? (
                      <span className="chip text-success">
                        <CheckCircle className="h-3 w-3" /> Accepting Clients
                      </span>
                    ) : (
                      <span className="chip text-error">
                        <XCircle className="h-3 w-3" /> Not Accepting
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                    {(Object.keys(DAY_LABELS) as (keyof LawyerAvailabilityData["schedule"])[]).map((day) => [day, availability.schedule[day]] as const).filter(([, sched]) => sched).map(([day, sched]) => (
                      <div
                        key={day}
                        className={`rounded-md border p-2 text-center text-xs ${sched.isAvailable ? "border-outline-variant bg-surface-raised text-on-surface shadow-[inset_0_1px_0_var(--highlight)]" : "border-transparent bg-surface-container text-on-surface-variant shadow-(--elev-inset)"}`}
                      >
                        <p className="font-semibold">{DAY_LABELS[day]}</p>
                        {sched.isAvailable && (
                          <p className="mt-0.5 text-[10px] leading-tight">
                            {sched.startTime}–{sched.endTime}
                          </p>
                        )}
                        {!sched.isAvailable && <p className="mt-0.5 text-[10px]">Off</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Firm info */}
              <div className="panel p-5">
                <p className="text-sm font-semibold text-on-surface">Islam &amp; Associates</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  A member of Islam &amp; Associates — dedicated to providing expert legal counsel across a wide range of practice areas.
                </p>
              </div>

              {/* Book CTA */}
              <div className="page-hero rounded-xl border border-white/10 p-6 text-center sm:p-8">
                <h2 className="text-xl text-white">
                  Book an Appointment with {lawyer.name}
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  Choose a convenient time for your consultation.
                </p>
                {availability?.isAcceptingNewClients === false ? (
                  <p className="btn btn-on-dark mt-5" aria-disabled="true">
                    Currently Unavailable
                  </p>
                ) : (
                  <Link
                    href={`/appointment?lawyerId=${id}`}
                    className="btn btn-primary btn-lg mt-5"
                  >
                    Book Appointment
                  </Link>
                )}
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



