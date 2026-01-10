import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Business Development & Logistics Solutions | Global Partner",
  description: "Comprehensive business development and logistics solutions. From digital transformation to supply chain management, we help businesses grow and operate efficiently.",
  keywords: "business development, logistics, digital transformation, supply chain, business consulting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
