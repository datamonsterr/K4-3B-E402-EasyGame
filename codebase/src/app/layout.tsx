import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EasyGame | Cohort workspace",
  description: "Verified course notices and a question radar for Lab Coaches.",
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
