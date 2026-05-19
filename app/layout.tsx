import type React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppWrapper } from "@/components/app-wrapper";
import { PI_NETWORK_CONFIG } from "@/lib/system-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Made with App Studio",
  description: "Pi Network app",
    generator: 'v0.app'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src={PI_NETWORK_CONFIG.SDK_URL}
          strategy="beforeInteractive"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}`,
          }}
        />
      </head>
      <body>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
