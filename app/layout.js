import './globals.css';

export const metadata = {
  title: 'ज्योतिष तथा वास्तु सेवा केन्द्र',
  description: 'वैदिक ज्योतिष र वास्तु परामर्श सेवा केन्द्र',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ne">
      <body>{children}</body>
    </html>
  );
}
