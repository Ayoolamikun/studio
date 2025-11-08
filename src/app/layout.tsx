import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import './globals.css';

export const metadata: Metadata = {
  title: 'Corporate Magnate Cooperative Society Ltd',
  description: 'Empowering Nigerians with flexible loans and secure investment opportunities in Bayelsa. Your trusted partner for financial freedom and growth.',
  keywords: "Loan Cooperative Bayelsa, Investment Nigeria, Civil Servant Loans, SME Loans Nigeria, Corporate Magnate, Financial Cooperative Bayelsa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
