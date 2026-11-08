import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Squeek Market — Prediction Markets',
  description: 'Bet on Squeektoshi the hamster. Powered by Squeekchain settled work.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
