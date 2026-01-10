import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from '../components/ThemeProvider';
import { AdminDataProvider } from '../contexts/AdminDataContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PostPart Admin Dashboard",
  description: "B2B Childcare Access Platform - Admin Dashboard",
  icons: {
    icon: '/postpart-logo.png',
    shortcut: '/postpart-logo.png',
    apple: '/postpart-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <AdminDataProvider>
            {children}
          </AdminDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
