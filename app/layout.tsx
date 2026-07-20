import type { Metadata } from "next";
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

export const metadata: Metadata = {
  icons: "logo-favicon.png",
  openGraph: {
    images: [
      {
        url: "https://vesper-hub.vercel.app/logo.png",
        width: 512,
        height: 512,
        alt: "Vesper Logo",
      },
    ],
    title: "Vesper",
    description: "Vesper - Your all-in-one solution for artists inspiration.",
    siteName: "Vesper",
    url: "https://vesper-hub.vercel.app/"
  },
  title: "Vesper",
  description: "Vesper - Your all-in-one solution for artists inspiration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
