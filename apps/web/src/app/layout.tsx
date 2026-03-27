import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TriageAI Practice Workspace",
  description: "Business-first clinical workspace for doctors, practitioners, HR, and patient operations.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f5f7fb",
          color: "#172033",
        }}
      >
        {children}
      </body>
    </html>
  );
}
