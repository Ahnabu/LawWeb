import { notFound } from "next/navigation";
import { CareerDetail } from "../../../components/CareerDetail";
import { getPublishedCareer } from "../../../lib/careers";
import { buildMetadata } from "../../../lib/seo";
import { richTextToPlain } from "../../../lib/richText";

export const revalidate = 300;

// Rendered on the server (5-minute ISR) so the opening text is in the HTML search
// engines read. An unknown or unpublished slug is a real 404.
export default async function CareerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const career = await getPublishedCareer(slug);
  if (!career) notFound();

  return <CareerDetail career={career} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const career = await getPublishedCareer(slug);
  if (!career) {
    return { title: "Opening not found", robots: { index: false, follow: true } };
  }

  return buildMetadata({
    title: `${career.title} | Careers`,
    description: richTextToPlain(career.description, 155) || `We are hiring a ${career.title}.`,
    path: `/careers/${encodeURIComponent(career.slug)}`,
    singleUrl: true,
  });
}