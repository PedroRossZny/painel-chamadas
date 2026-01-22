import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Painel de Chamadas",
  description: "Sistema de painel de chamadas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 text-zinc-100`}
      >
        <div className="flex min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
