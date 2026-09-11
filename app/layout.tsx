import type { Metadata, Viewport } from "next";
import { Fredoka, Noto_Sans_TC } from "next/font/google";
import { ScreenLockProvider } from "@/components/screen-lock-provider";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fredoka",
});

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "寶寶愛塗鴉",
  description: "給 2 到 6 歲小朋友的線上塗鴉",
  appleWebApp: {
    capable: true,
    title: "寶寶愛塗鴉",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FFF6EB",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${fredoka.variable} ${notoSansTc.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream font-sans text-ink">
        <ScreenLockProvider>{children}</ScreenLockProvider>
      </body>
    </html>
  );
}
