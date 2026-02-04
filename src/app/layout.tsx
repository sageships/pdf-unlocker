import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Unlocker - Remove PDF Restrictions",
  description: "Remove editing restrictions from your PDFs instantly. 100% free, works offline, no file uploads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
