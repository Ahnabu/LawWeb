import { MessageCircle } from 'lucide-react'

interface WhatsAppCtaProps {
  inline?: boolean
}

export function WhatsAppCta({ inline }: WhatsAppCtaProps) {
  return (
    <a
      href="https://wa.me/8801715365380?text=Hi%2C%20I%20need%20legal%20consultation%20regarding%20..."
      target="_blank"
      rel="noreferrer"
      className={inline ? 'inline-flex items-center justify-center gap-2 rounded-md border border-whatsapp/20 bg-whatsapp/10 px-4 py-3 text-sm font-semibold text-whatsapp transition hover:bg-whatsapp/20' : 'fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-whatsapp/30 transition hover:scale-[1.02] hover:bg-whatsapp/90'}
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
      {inline ? 'Message Us on WhatsApp' : 'Chat with us'}
    </a>
  )
}
