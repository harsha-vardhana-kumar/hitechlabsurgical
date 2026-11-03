import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <p>This admin page or record is unavailable.</p>
      <Link className="button" href="/">
        Back to dashboard
      </Link>
    </section>
  );
}
