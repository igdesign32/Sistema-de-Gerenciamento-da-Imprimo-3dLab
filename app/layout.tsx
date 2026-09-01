import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Imprimo3DLab — Gerenciamento',
  description: 'Orçamentos, pedidos, produção, estoque e financeiro em um só lugar.',
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    shortcut: '/favicon-32.png',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Imprimo3DLab — Gerenciamento',
    description: 'Gerenciamento inteligente para impressão 3D: do orçamento à entrega.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Imprimo3DLab — Gerenciamento inteligente para impressão 3D' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Imprimo3DLab — Gerenciamento',
    description: 'Gerenciamento inteligente para impressão 3D: do orçamento à entrega.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
