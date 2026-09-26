import type { Metadata } from "next";

// The reset token arrives in the URL; never send it on as a Referer
export const metadata: Metadata = {
  title: "Reset Password",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
