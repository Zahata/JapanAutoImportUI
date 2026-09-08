import './globals.css';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Japan Auto Import',
  description: 'Подбрани японски автомобили с прозрачна крайна цена.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="bg"><body className={montserrat.variable}>{children}</body></html>;
}
