import { demoWorkspaceEnabled } from "@hitech/config/workspace-mode";
import type { Metadata } from "next";
import { Provider } from "../components/provider";
import { Shell } from "../components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Hitech · Administration", template: "%s · Hitech Admin" },
  description:
    "Website and business administration for Hitech Life Science & Surgicals.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  const enabled = demoWorkspaceEnabled(
    process.env.HITECH_WORKSPACE_STAGE,
    process.env.NEXT_PUBLIC_ADMIN_MODE,
  );
  return (
    <html lang="en">
      <body>
        {enabled ? (
          <Provider>
            <Shell>{children}</Shell>
          </Provider>
        ) : (
          <main className="setup-required">
            <h1>Production setup required</h1>
            <p>
              Connect and validate the identity provider, server authorization
              and API before enabling production. Demo storage is disabled in
              this mode.
            </p>
          </main>
        )}
      </body>
    </html>
  );
}
