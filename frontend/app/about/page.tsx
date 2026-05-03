import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { timelineItems } from '../../lib/data'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="bg-primary px-6 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">About Islam & Associates</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight">A Legacy of Legal Excellence in Bangladesh</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            We believe in honest, sincere and fast remedies for our clients and believe in growth with our clients&apos; successes.
          </p>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-elevated space-y-6 p-10">
            <h2 className="font-display text-3xl font-semibold text-on-surface">Firm Overview</h2>
            <p className="text-base leading-7 text-on-surface-variant">
              Islam & Associates is an elite law firm serving Dhaka and global clients with deep expertise across corporate, civil, criminal, immigration, and family law. Our commitment is to deliver transparent, ethical, and rapid legal solutions.
            </p>
            <div className="rounded-xl bg-secondary/10 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Our Promise</p>
              <p className="mt-4 text-lg font-semibold leading-7 text-on-surface">We believe in honest, sincere and fast remedies for our clients and believe in growth with our clients' successes.</p>
            </div>
          </div>
          <div className="card-elevated p-10">
            <h3 className="font-display text-2xl font-semibold text-on-surface">Certifications & Affiliations</h3>
            <ul className="mt-6 space-y-3 text-on-surface-variant">
              <li>Harvard University - Internet Law</li>
              <li>Central Law Training, England</li>
              <li>Kensington University, USA</li>
              <li>Neil Weinrib PC, USA</li>
              <li>Ashley Bean & Co. Solicitors, England</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-surface-container px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold text-on-surface">Founding Timeline</h2>
          <div className="mt-12 space-y-8">
            {timelineItems.map((item) => (
              <div key={item.year} className="card-elevated grid gap-4 p-8 md:grid-cols-[150px_1fr]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{item.year}</div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-on-surface">{item.title}</h3>
                  <p className="mt-3 text-on-surface-variant">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-elevated p-10">
            <h2 className="font-display text-3xl font-semibold text-on-surface">Principal Profile</h2>
            <p className="mt-4 text-lg font-semibold text-on-surface">Mufassil MM Islam — LL.B (Hons) & LL.M, Dhaka University</p>
            <p className="mt-3 leading-7 text-on-surface-variant">
              Principal counsel with decades of litigation and international compliance experience. Trusted by local and global clients to navigate complex law with clarity.
            </p>
            <div className="mt-8 space-y-4">
              {['Harvard University (Internet Law)', 'Central Law Training England', 'Kensington University USA', 'Neil Weinrib PC USA', 'Ashley Bean & Co. Solicitors England'].map((credential) => (
                <p key={credential} className="rounded-xl bg-surface-container p-4 text-on-surface-variant">{credential}</p>
              ))}
            </div>
          </div>
          <div className="card-elevated p-10">
            <h2 className="font-display text-3xl font-semibold text-on-surface">Mission & Values</h2>
            <div className="mt-8 space-y-6">
              {['Integrity', 'Expertise', 'Client Success'].map((value) => (
                <div key={value} className="rounded-xl bg-surface-container p-6">
                  <h3 className="text-xl font-semibold text-on-surface">{value}</h3>
                  <p className="mt-2 text-on-surface-variant">Committed to maintaining the highest standards in every legal engagement, always acting with honesty and transparency.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
