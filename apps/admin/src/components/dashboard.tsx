"use client";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  FileEdit,
  Star,
  Layers,
  Inbox,
  MessageSquare,
  CloudUpload,
  ArrowUpRight,
  ImageIcon,
  Search,
  ArrowRight,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "./provider";
import { PageHeader, Panel, Status, Empty } from "./ui";
import { unpublished } from "../domain/projections";
import { humanDate } from "@hitech/utils";
export default function Dashboard() {
  const { workspace: w, allowed } = useWorkspace();
  const pending = unpublished(w);
  const published = w.products.filter((p) => p.published);
  const missingImages = w.products.filter(
    (p) => !p.imageId && p.status !== "Archived",
  );
  const missingSeo = w.products.filter(
    (p) => !p.seo.description && p.status !== "Archived",
  );
  const metrics = [
    {
      label: "Public products",
      value: published.length,
      caption: "In the demo published catalogue",
      icon: Package,
      href: "/products",
    },
    {
      label: "Active products",
      value: w.products.filter((p) => p.visible && p.status !== "Archived")
        .length,
      caption: "Visible or ready for preparation",
      icon: CheckCircle2,
      href: "/products",
    },
    {
      label: "Draft products",
      value: w.products.filter((p) => p.status === "Draft").length,
      caption: "Awaiting review and publishing",
      icon: FileEdit,
      href: "/products",
    },
    {
      label: "Featured products",
      value: w.products.filter((p) => p.featured).length,
      caption: "Marked for homepage selection",
      icon: Star,
      href: "/featured",
    },
    {
      label: "Categories",
      value: w.categories.length,
      caption: "Organized catalogue collections",
      icon: Layers,
      href: "/categories",
    },
    {
      label: "New quote requests",
      value: w.enquiries.filter((e) => e.kind === "quote" && e.status === "New")
        .length,
      caption: "Fictional sample requests",
      icon: Inbox,
      href: "/enquiries/quotes",
    },
    {
      label: "New contact enquiries",
      value: w.enquiries.filter(
        (e) => e.kind === "contact" && e.status === "New",
      ).length,
      caption: "Fictional sample messages",
      icon: MessageSquare,
      href: "/enquiries/contacts",
    },
    {
      label: "Unpublished changes",
      value: pending.length,
      caption: "Draft records awaiting release",
      icon: CloudUpload,
      href: "/publishing",
    },
  ];
  return (
    <>
      <PageHeader
        title="Your website, in focus."
        eyebrow="Overview"
        description="Manage your catalogue, follow up on enquiries, and keep your website current."
        actions={
          <>
            {allowed("activity.view") && (
              <Link className="button secondary" href="/publishing">
                <CloudUpload size={16} />
                Publishing status
              </Link>
            )}
            {allowed("products.manage") && (
              <Link className="button" href="/products/new">
                <Plus size={17} />
                Add product
              </Link>
            )}
          </>
        }
      />
      <div className="workspace-banner">
        <div className="banner-icon">
          <ShieldCheck size={23} />
        </div>
        <div>
          <strong>A safe space to prepare your website.</strong>
          <p>
            Demo Workspace · 55 catalogue items imported as drafts. Sample
            enquiries are fictional. Publishing here does not change the live
            website.
          </p>
        </div>
        <span className="banner-tag">BROWSER LOCAL</span>
      </div>
      <div className="metrics-grid">
        {metrics.map((m) => (
          <div className="metric" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <m.icon size={18} />
            </div>
            <strong>{m.value.toString().padStart(2, "0")}</strong>
            <p>{m.caption}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Catalogue readiness"
          action={
            allowed("products.manage") ? (
              <Link className="text-link" href="/products">
                Review catalogue <ArrowUpRight size={14} />
              </Link>
            ) : undefined
          }
        >
          <div className="readiness-intro">
            <div className="readiness-number">
              {w.products.length}
              <span>products to manage</span>
            </div>
            <p>
              Keep product details accurate.
              <br />
              Confirm specifications before publishing.
            </p>
          </div>
          <div className="readiness-list">
            {[
              {
                icon: ImageIcon,
                label: "Product images needed",
                count: missingImages.length,
                href: "/products?filter=images",
                description: "Add approved product photographs.",
              },
              {
                icon: Search,
                label: "SEO descriptions needed",
                count: missingSeo.length,
                href: "/products?filter=seo",
                description: "Help customers find the right products.",
              },
              {
                icon: FileEdit,
                label: "Specifications to verify",
                count: w.products.filter((p) => p.needsReview).length,
                href: "/products?filter=review",
                description: "Resolve handwritten catalogue review flags.",
              },
            ].map((r) => (
              <Link href={r.href} key={r.label}>
                <span className="soft-icon">
                  <r.icon size={19} />
                </span>
                <div>
                  <strong>{r.label}</strong>
                  <p>{r.description}</p>
                </div>
                <span className="count-pill">{r.count}</span>
                <Chevron />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel className="publish-card" title="Publishing workspace">
          <div className="publish-illustration">
            <CloudUpload size={46} strokeWidth={1} />
          </div>
          <h3>From draft to ready.</h3>
          <p>
            Preview your changes, verify details, then publish a separate
            snapshot for the demo catalogue.
          </p>
          <div className="publish-stats">
            <div>
              <strong>{pending.length}</strong>
              <span>pending records</span>
            </div>
            <div>
              <strong>{w.publishing.length}</strong>
              <span>publish events</span>
            </div>
          </div>
          {allowed("activity.view") && (
            <Link className="button light" href="/publishing">
              Review publishing status <ArrowRight size={16} />
            </Link>
          )}
        </Panel>
      </div>
      <div className="dashboard-grid equal">
        <Panel
          title="Latest enquiries"
          action={
            allowed("enquiries.manage") ? (
              <Link className="text-link" href="/enquiries/quotes">
                View all <ArrowUpRight size={14} />
              </Link>
            ) : (
              <Status value="Demo" />
            )
          }
        >
          {allowed("enquiries.manage") ? (
            <div className="record-list">
              {w.enquiries.slice(0, 4).map((e) => (
                <Link
                  href={`/enquiries/${e.kind === "quote" ? "quotes" : "contacts"}/${e.id}`}
                  key={e.id}
                >
                  <span className="avatar soft">
                    {e.organisation
                      .split(" ")
                      .slice(1, 3)
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <div>
                    <strong>{e.organisation || e.name}</strong>
                    <p>
                      {e.productName || "Contact enquiry"} ·{" "}
                      {humanDate(e.submittedAt)}
                    </p>
                  </div>
                  <Status value={e.status} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Enquiry overview"
              description={`${w.enquiries.length} sample enquiries. Switch to Sales, Admin or Owner to manage them.`}
            />
          )}
        </Panel>
        <Panel
          title="Recently edited products"
          action={
            allowed("products.manage") ? (
              <Link className="text-link" href="/products">
                Open catalogue <ArrowUpRight size={14} />
              </Link>
            ) : undefined
          }
        >
          <div className="record-list">
            {[...w.products]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 4)
              .map((p) => (
                <Link href={`/products/${p.id}`} key={p.id}>
                  <span className="soft-icon">
                    <Package size={19} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <p>
                      {w.categories.find((c) => c.id === p.categoryId)?.name ||
                        "Uncategorized"}
                    </p>
                  </div>
                  <Status value={p.status} />
                </Link>
              ))}
          </div>
        </Panel>
      </div>
      <div className="dashboard-grid equal">
        <Panel title="Recent content changes">
          {w.activity.length ? (
            <div className="timeline">
              {w.activity.slice(0, 4).map((a) => (
                <div key={a.id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{a.action.replaceAll(".", " · ")}</strong>
                    <p>
                      {a.actor} · {humanDate(a.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="A clear activity trail"
              description="Your edits and publishing actions will appear here."
            />
          )}
        </Panel>
        <Panel title="Recent publishing activity">
          {w.publishing.length ? (
            <div className="record-list">
              {w.publishing.slice(0, 4).map((p) => (
                <div key={p.id}>
                  <CloudUpload size={20} />
                  <div>
                    <strong>{p.name}</strong>
                    <p>{humanDate(p.timestamp)} · Demo only</p>
                  </div>
                  <Status value={p.action} />
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No releases yet"
              description="Publish a validated draft to create your first demo snapshot."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
function Chevron() {
  return <ArrowUpRight size={16} />;
}
