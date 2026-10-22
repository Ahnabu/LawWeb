import { notFound } from 'next/navigation'
import { JsonLd } from '../../../components/JsonLd'
import { getPublicLawyer } from '../../../lib/lawyers'
import { lawyerProfileMetadata } from '../../../lib/seo'
import { lawyerJsonLd } from '../../../lib/structuredData'

// The profile page loads its details in the browser; this layout gives it a
// real title, description, structured data and a 404 for unknown lawyers.
export const generateMetadata = lawyerProfileMetadata

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lawyer = await getPublicLawyer(id)
  if (!lawyer) notFound()

  return (
    <>
      <JsonLd data={lawyerJsonLd(lawyer.user, lawyer.profile)} />
      {children}
    </>
  )
}
