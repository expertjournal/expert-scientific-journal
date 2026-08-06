import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/i18n-context";

export const metadata: Metadata = {
  title: "Expert — International Scientific Journal",
  description: "Multidisciplinary open-access scientific journal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
