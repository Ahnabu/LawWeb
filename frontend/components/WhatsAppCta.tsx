interface WhatsAppCtaProps {
  inline?: boolean
}

function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.04 0C5.42 0 .02 5.39.02 12a11.92 11.92 0 0 0 1.62 6.02L0 24l6.17-1.61A11.92 11.92 0 0 0 12.04 24h.01c6.62 0 12.02-5.39 12.02-12a11.82 11.82 0 0 0-3.55-8.52Zm-8.48 18.5h-.01a9.92 9.92 0 0 1-5.05-1.39l-.36-.21-3.66.96.98-3.58-.24-.37A9.98 9.98 0 0 1 2.06 12c0-5.47 4.46-9.92 9.98-9.92a9.88 9.88 0 0 1 7 2.9A9.83 9.83 0 0 1 21.96 12c0 5.48-4.46 9.98-9.92 9.98Zm5.78-7.45c-.32-.16-1.9-.94-2.19-1.05-.29-.11-.5-.16-.71.16-.21.32-.82 1.05-1 1.26-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.56-1.56-.95-.85-1.59-1.89-1.77-2.21-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.39-.03-.55-.08-.16-.71-1.71-.98-2.34-.26-.62-.53-.54-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.23 3.41 5.42 4.78 3.2 1.37 3.2.92 3.78.87.58-.05 1.9-.78 2.18-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  )
}

export function WhatsAppCta({ inline }: WhatsAppCtaProps) {
  return (
    <a
      href="https://wa.me/8801715365380?text=Hi%2C%20I%20need%20legal%20consultation%20regarding%20..."
      target="_blank"
      rel="noreferrer"
      className={inline ? 'inline-flex items-center justify-center gap-2 rounded-md border border-whatsapp/20 bg-whatsapp/10 px-4 py-3 text-sm font-semibold text-whatsapp transition hover:bg-whatsapp/20' : 'fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg shadow-whatsapp/30 transition hover:scale-[1.05] hover:bg-whatsapp/90'}
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppMark className={inline ? 'h-4 w-4' : 'h-6 w-6'} />
      {inline ? 'Message Us on WhatsApp' : null}
    </a>
  )
}
