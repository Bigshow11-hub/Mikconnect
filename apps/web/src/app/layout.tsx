import type { Metadata, Viewport } from "next";

import { Toaster } from "@mikconnect/ui";
import { QueryProvider } from "@/providers/query-provider";
import { MotionProvider } from "@/providers/motion-provider";
import { AuthBootstrap } from "@/features/auth/auth-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "mikconnect",
  description: "Pilotez vos zones WiFi, vendez plus, gardez le contrôle.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "oklch(0.972 0.008 255)",
};

const themeScript = `(() => {
  try {
    const saved = localStorage.getItem("mikconnect.theme");
    document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
  } catch { document.documentElement.dataset.theme = "light"; }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MotionProvider>
          <QueryProvider>
            <AuthBootstrap />
            {children}
          </QueryProvider>
        </MotionProvider>
        <Toaster />
      </body>
    </html>
  );
}
