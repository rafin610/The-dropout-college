import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const viewport: Viewport = {
  themeColor: "#08090a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thedropoutcollege.com"),
  title: {
    default: "The DropOut College | A Home for the Relentlessly Curious",
    template: "%s | The DropOut College",
  },
  description:
    "The DropOut College is a learning-focused community where people come together to learn, ask questions, share ideas, build projects, and grow together.",
  keywords: [
    "Dropout College",
    "learning community",
    "collaboration",
    "mentorship",
    "projects",
    "events",
    "software engineering",
    "design",
  ],
  authors: [{ name: "The DropOut College Team" }],
  openGraph: {
    title: "The DropOut College | A Home for the Relentlessly Curious",
    description:
      "A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.",
    url: "https://thedropoutcollege.com",
    siteName: "The DropOut College",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The DropOut College",
    description: "A learning-focused community built around curiosity, knowledge sharing, guidance, and personal growth.",
  },
  icons: {
    icon: "/logo.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
