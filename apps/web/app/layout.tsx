import './globals.css';

export const metadata = {
  title: 'Dronagiri Herbal',
  description: 'Dronagiri Herbal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
