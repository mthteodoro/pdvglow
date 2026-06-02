import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glow Clothings PDV",
  description: "Sistema PDV Web para Glow Clothings",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
