import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HTML AI 互动学习助手",
  description: "你的专属 HTML 学习助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
