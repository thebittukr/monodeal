import "./globals.css";

export const metadata = {
  title: "Property Rush — Fast Property Card Game",
  description: "A fast-paced multiplayer property trading card game. Collect sets, charge rent, and outwit your opponent!",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-950 text-white antialiased" style={{ minHeight: "100dvh" }}>
        {children}
      </body>
    </html>
  );
}
