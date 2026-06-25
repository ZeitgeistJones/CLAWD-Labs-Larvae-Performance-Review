import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLAWD Labs: Larvae Performance Review",
  description:
    "How well did CLAWD Labs builds match what the larva community asked for? Scored, tracked, and public.",
  openGraph: {
    title: "CLAWD Labs: Larvae Performance Review",
    description:
      "How well did CLAWD Labs builds match what the larva community asked for? Scored, tracked, and public.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
