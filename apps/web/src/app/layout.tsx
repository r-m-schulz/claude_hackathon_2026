import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TriageAI",
  description: "Clinical triage and scheduling platform scaffold",
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
