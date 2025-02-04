import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "薬事法適合チェックツール",
  description: "薬事法に基づく製品情報の安全性や効能を正確に評価できる革新的な法適合チェックツールです。直感的な操作と洗練されたデザインで迅速かつ信頼性の高い検証が実現できます。業界標準に沿った堅牢なデータ処理で、安心してご利用いただける信頼のツールです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
