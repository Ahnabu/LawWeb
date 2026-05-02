import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { timelineItems } from '../../lib/data'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="bg-slate-950 px-6 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300">About Islam & Associates</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">A Legacy of Legal Excellence in Bangladesh</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            We believe in honest, sincere and fast remedies for our clients and believe in growth with our clients&apos; successes.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
            <h2 className="text-3xl font-semibold text-primary">Firm Overview</h2>
            <p className="text-base leading-7 text-slate-600">
              Islam & Associates is an elite law firm serving Dhaka and global clients with deep expertise across corporate, civil, criminal, immigration, and family law. Our commitment is to deliver transparent, ethical, and rapid legal solutions.
            </p>
            <div className="rounded-3xl bg-amber-50 p-8 text-slate-900 shadow-sm">
              <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Our Promise</p>
              <p className="mt-4 text-lg font-semibold leading-7">We believe in honest, sincere and fast remedies for our clients and believe in growth with our clients' successes.</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
            <h3 className="text-2xl font-semibold text-primary">Certifications & Affiliations</h3>
            <ul className="mt-6 space-y-3 text-slate-600">
              <li>Harvard University - Internet Law</li>
              <li>Central Law Training, England</li>
              <li>Kensington University, USA</li>
              <li>Neil Weinrib PC, USA</li>
              <li>Ashley Bean & Co. Solicitors, England</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-primary">Founding Timeline</h2>
          <div className="mt-12 space-y-8">
            {timelineItems.map((item) => (
              <div key={item.year} className="grid gap-4 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl md:grid-cols-[150px_1fr]">
                <div className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">{item.year}</div>
                <div>
                  <h3 className="text-xl font-semibold text-primary">{item.title}</h3>
                  <p className="mt-3 text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
            <h2 className="text-3xl font-semibold text-primary">Principal Profile</h2>
            <p className="mt-4 text-lg font-semibold text-slate-900">Mufassil MM Islam — LL.B (Hons) & LL.M, Dhaka University</p>
            <p className="mt-3 text-slate-600 leading-7">
              Principal counsel with decades of litigation and international compliance experience. Trusted by local and global clients to navigate complex law with clarity.
            </p>
            <div className="mt-8 space-y-4">
              {['Harvard University (Internet Law)', 'Central Law Training England', 'Kensington University USA', 'Neil Weinrib PC USA', 'Ashley Bean & Co. Solicitors England'].map((credential) => (
                <p key={credential} className="rounded-3xl bg-slate-50 p-4 text-slate-700">{credential}</p>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
            <h2 className="text-3xl font-semibold text-primary">Mission & Values</h2>
            <div className="mt-8 space-y-6">
              {['Integrity', 'Expertise', 'Client Success'].map((value) => (
                <div key={value} className="rounded-3xl bg-slate-50 p-6">
                  <h3 className="text-xl font-semibold text-slate-900">{value}</h3>
                  <p className="mt-2 text-slate-600">Committed to maintaining the highest standards in every legal engagement, always acting with honesty and transparency.</p>
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
