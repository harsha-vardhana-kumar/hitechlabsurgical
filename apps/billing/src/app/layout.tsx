import type { Metadata } from "next";
import { WorkspaceProvider } from "../components/provider";
import { Shell } from "../components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "Hitech Business Workspace · Demo",
  description:
    "Hitech Lab & Surgical Solutions billing and operations demo workspace.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/favicon.svg", apple: "/brand/apple-touch-icon.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <Shell>{children}</Shell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
