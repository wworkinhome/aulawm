import type { Metadata } from "next";
import { Archivo, Azeret_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font per the design handoff's README ("Autoalojarlas
// con next/font/google para evitar el salto de fuente") — avoids the
// prototype's runtime Google Fonts <link>/@import.
// Named --font-archivo/--font-azeret-mono (not --font-sans/--font-mono) so
// these never collide with the plain-string --font-sans/--font-mono tokens
// already defined in @aulawm/tokens/css. globals.css's Tailwind @theme block
// points --font-sans/--font-mono at these two variables.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AulaWM",
  description: "LMS — Wilmer Mosquera",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${azeretMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
