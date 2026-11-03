import { demoWorkspaceEnabled } from "@hitech/config/workspace-mode";
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
  const enabled = demoWorkspaceEnabled(
    process.env.HITECH_WORKSPACE_STAGE,
    process.env.NEXT_PUBLIC_BILLING_MODE,
  );
  return (
    <html lang="en">
      <body>
        {enabled ? (
          <WorkspaceProvider>
            <Shell>{children}</Shell>
          </WorkspaceProvider>
        ) : (
          <main className="startup">
            <h1>Production setup required</h1>
            <p>
              Connect a verified identity provider and billing service to open a
              production workspace.
            </p>
          </main>
        )}
      </body>
    </html>
  );
}
