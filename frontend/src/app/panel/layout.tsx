import type { Metadata } from "next";

// Only the root layout renders <html> and <body>; this one just sets the
// title of the TV panel.
export const metadata: Metadata = {
  title: "Painel Chamadas",
  description: "Painel de chamadas em tempo real",
};

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
