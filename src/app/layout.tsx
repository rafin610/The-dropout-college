import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./campus.css";
import "./app.css";
import "./midnight-glass.css";
import "katex/dist/katex.min.css";
import { AppShell } from "@/components/app-shell";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2C5364" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2027" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thedropoutcollege.com"),
  title: {
    default: "The DropOut College | Campus",
    template: "%s | The DropOut College",
  },
  description:
    "A quiet campus for the relentlessly curious. Share a thought, join the conversation, and read the DropOut Journal.",
  keywords: [
    "Dropout College",
    "community",
    "journal",
    "learning",
    "writing",
  ],
  authors: [{ name: "The DropOut College Team" }],
  openGraph: {
    title: "The DropOut College | Campus",
    description:
      "Share a thought, join the conversation, and read the DropOut Journal.",
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
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-sidebar="expanded"
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tdc-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);var s=localStorage.getItem('tdc-sidebar');document.documentElement.setAttribute('data-sidebar',s==='collapsed'?'collapsed':'expanded');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
