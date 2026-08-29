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
  title: 'Forma3D — Gestão de impressão 3D',
  description: 'Orçamentos, pedidos, produção, estoque e financeiro em um só lugar.',
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Forma3D — Gestão de impressão 3D',
    description: 'Gestão inteligente para impressão 3D: do orçamento à entrega.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Forma3D — Gestão inteligente para impressão 3D' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forma3D — Gestão de impressão 3D',
    description: 'Gestão inteligente para impressão 3D: do orçamento à entrega.',
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
