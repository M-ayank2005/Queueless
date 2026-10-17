import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QueueLess — Smart Digital Queue Management",
  description: "Eliminate lines forever. Join digital queues instantly via QR codes, track live wait times, and get notified when it's your turn.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "QueueLess — Smart Digital Queue Management",
    description: "Eliminate lines forever. The smartest way to manage customer flow.",
    siteName: "QueueLess",
  },
};

// Inline pre-paint script to prevent theme flash before first visible render
const themeInitScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem('ql_theme');
    var isDark = storedTheme === 'dark';
    var doc = document.documentElement;
    if (isDark) {
      doc.classList.add('dark');
      doc.classList.remove('light');
      doc.style.colorScheme = 'dark';
    } else {
      doc.classList.add('light');
      doc.classList.remove('dark');
      doc.style.colorScheme = 'light';
    }
  } catch (e) {
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen transition-colors duration-150`}
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
