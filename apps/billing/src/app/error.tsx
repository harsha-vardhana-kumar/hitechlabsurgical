"use client";
import Link from "next/link";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="empty">
      <h1>Unable to display this screen</h1>
      <p>
        Your saved workspace has not been cleared. Retry or return to the
        overview.
      </p>
      <div className="actions">
        <button onClick={retry}>Retry</button>
        <Link className="button secondary" href="/dashboard">
          Overview
        </Link>
      </div>
    </div>
  );
}
