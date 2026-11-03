"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Layers,
  Star,
  Images,
  FileText,
  Inbox,
  MessageSquare,
  Search,
  Settings2,
  Building2,
  Phone,
  Palette,
  Users,
  History,
  CloudUpload,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Bell,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Command,
  ShieldCheck,
} from "lucide-react";
import type { Permission } from "@hitech/types/admin";
import { brand } from "@hitech/brand";
import { useWorkspace } from "./provider";
import { Modal, Empty } from "./ui";
import { unpublished } from "../domain/projections";
const groups = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Website",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: Layers },
      { label: "Featured products", href: "/featured", icon: Star },
      { label: "Media library", href: "/media", icon: Images },
      { label: "Pages & content", href: "/content", icon: FileText },
    ],
  },
  {
    title: "Enquiries",
    items: [
      { label: "Quote requests", href: "/enquiries/quotes", icon: Inbox },
      {
        label: "Contact enquiries",
        href: "/enquiries/contacts",
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Optimize",
    items: [
      { label: "Page metadata", href: "/seo/pages", icon: Search },
      { label: "Product SEO", href: "/seo/products", icon: Search },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Business profile",
        href: "/settings/business",
        icon: Building2,
      },
      { label: "Contact information", href: "/settings/contact", icon: Phone },
      { label: "Website settings", href: "/settings/website", icon: Settings2 },
      { label: "Brand settings", href: "/settings/brand", icon: Palette },
      { label: "Users & roles", href: "/settings/users", icon: Users },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Activity log", href: "/activity", icon: History },
      { label: "Publishing status", href: "/publishing", icon: CloudUpload },
    ],
  },
];
const routePermission = (href: string): Permission =>
  href.startsWith("/enquiries")
    ? "enquiries.manage"
    : href.startsWith("/settings/users")
      ? "users.manage"
      : href.startsWith("/settings") || href === "/featured"
        ? "settings.manage"
        : href.startsWith("/seo")
          ? "seo.manage"
          : href.startsWith("/content")
            ? "content.manage"
            : href.startsWith("/media")
              ? "media.manage"
              : href === "/activity" || href === "/publishing"
                ? "activity.view"
                : href === "/categories"
                  ? "categories.manage"
                  : href === "/products"
                    ? "products.manage"
                    : "dashboard.view";
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { workspace, session, allowed, switchUser } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const pending = unpublished(workspace);
  const newEnquiries = workspace.enquiries.filter(
    (e) => e.status === "New",
  ).length;
  const nav = (
    <nav aria-label="Main navigation">
      {groups.map((g) => (
        <div className="nav-group" key={g.title}>
          <p className="nav-label">{g.title}</p>
          {g.items
            .filter((i) => allowed(routePermission(i.href)))
            .map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`nav-item ${(i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)) ? "active" : ""}`}
                aria-current={
                  (
                    i.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(i.href)
                  )
                    ? "page"
                    : undefined
                }
                title={collapsed ? i.label : undefined}
                onClick={() => setMobile(false)}
              >
                <i.icon size={18} />
                <span>{i.label}</span>
                {i.href === "/enquiries/quotes" &&
                  workspace.enquiries.some(
                    (e) => e.kind === "quote" && e.status === "New",
                  ) && (
                    <b className="nav-counter">
                      {
                        workspace.enquiries.filter(
                          (e) => e.kind === "quote" && e.status === "New",
                        ).length
                      }
                    </b>
                  )}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
  const results = query.trim()
    ? [
        ...(allowed("products.manage")
          ? workspace.products
              .filter((p) =>
                `${p.name} ${p.sku} ${p.slug}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => ({
                id: p.id,
                name: p.name,
                type: "Product",
                href: `/products/${p.id}`,
              }))
          : []),
        ...(allowed("categories.manage")
          ? workspace.categories
              .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
              .map((c) => ({
                id: c.id,
                name: c.name,
                type: "Category",
                href: `/categories/${c.id}`,
              }))
          : []),
        ...(allowed("enquiries.manage")
          ? workspace.enquiries
              .filter((e) =>
                `${e.name} ${e.organisation} ${e.id} ${e.productName} ${e.internalNotes}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((e) => ({
                id: e.id,
                name: e.organisation || e.name,
                type: "Demo enquiry",
                href: `/enquiries/${e.kind === "quote" ? "quotes" : "contacts"}/${e.id}`,
              }))
          : []),
      ].slice(0, 20)
    : [];
  const currentLabel =
    groups
      .flatMap((g) => g.items)
      .filter((i) =>
        i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
      )
      .at(-1)?.label || "Record details";
  return (
    <div className={`workspace-shell ${collapsed ? "is-collapsed" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link
          className="sidebar-brand"
          href="/"
          aria-label="Hitech administration"
        >
          <Image
            src={collapsed ? brand.markWhite : brand.logoWhite}
            width={collapsed ? 36 : 182}
            height={46}
            alt="Hitech"
          />
          <span>ADMINISTRATION</span>
        </Link>
        <div className="sidebar-scroll">{nav}</div>
        <div className="sidebar-bottom">
          <div className="workspace-label">
            <span className="workspace-dot" />
            <div>
              <strong>Demo Workspace</strong>
              <small>Local to this browser</small>
            </div>
          </div>
          <button
            className="collapse-button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <>
                <PanelLeftClose size={18} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <button className="global-search" onClick={() => setSearch(true)}>
            <Search size={18} />
            <span>Search anything…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-actions">
            <a
              className="view-site"
              href={
                workspace.settings.business.website ||
                workspace.settings.site.websiteUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              Public website <ArrowUpRight size={15} />
            </a>
            <span className="demo-pill">Demo workspace</span>
            <button
              className="icon-button notification-button"
              aria-label="View notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {newEnquiries > 0 && <span />}
            </button>
            <button
              className="user-button"
              aria-label="Open user menu"
              onClick={() => setUserMenu(true)}
            >
              <span className="avatar">
                {session.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{session.name}</strong>
                <small>{session.role}</small>
              </div>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={12} />
            <span>{currentLabel}</span>
          </div>
          {children}
          <footer className="workspace-footer">
            <span>{workspace.settings.business.tradeName}</span>
            <span>Demonstration · Changes stay in this browser</span>
          </footer>
        </main>
      </div>
      {mobile && (
        <Modal title="Navigation" onClose={() => setMobile(false)}>
          <div className="mobile-navigation">{nav}</div>
        </Modal>
      )}
      {search && (
        <Modal title="Search workspace" onClose={() => setSearch(false)}>
          <label className="search-field command-search">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Global search"
              placeholder="Products, categories, enquiries…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  document
                    .querySelector<HTMLAnchorElement>(".search-results a")
                    ?.focus();
                }
              }}
            />
          </label>
          <div
            className="search-results"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const links = Array.from(e.currentTarget.querySelectorAll("a"));
                const index = links.indexOf(
                  document.activeElement as HTMLAnchorElement,
                );
                links[
                  (index + (e.key === "ArrowDown" ? 1 : -1) + links.length) %
                    links.length
                ]?.focus();
              }
            }}
          >
            {results.map((r) => (
              <Link
                href={r.href}
                key={r.id}
                onClick={() => {
                  setSearch(false);
                  setQuery("");
                }}
              >
                <div>
                  <strong>{r.name}</strong>
                  <small>
                    {r.type} · {r.id}
                  </small>
                </div>
                <ChevronRight size={16} />
              </Link>
            ))}
            {query && !results.length && <Empty title="No matches" />}
            {!query && (
              <p className="search-hint">
                <Command size={16} /> Type to search. Use arrow keys and Enter
                to open a result.
              </p>
            )}
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="Workspace notifications"
          onClose={() => setNotifications(false)}
        >
          <div className="notification-list">
            <Link href="/publishing" onClick={() => setNotifications(false)}>
              <CloudUpload size={21} />
              <div>
                <strong>{pending.length} unpublished changes</strong>
                <p>Review drafts before simulating a publish.</p>
              </div>
            </Link>
            {allowed("enquiries.manage") && (
              <Link
                href="/enquiries/quotes"
                onClick={() => setNotifications(false)}
              >
                <Inbox size={21} />
                <div>
                  <strong>{newEnquiries} new sample enquiries</strong>
                  <p>These are fictional demonstration records.</p>
                </div>
              </Link>
            )}
            <p className="callout">
              No live website connection. Demo activity is saved only in this
              browser.
            </p>
          </div>
        </Modal>
      )}
      {userMenu && (
        <Modal title="Demo session" onClose={() => setUserMenu(false)}>
          <div className="callout">
            <ShieldCheck size={20} />
            <p>
              Role switching demonstrates permissions. It is not authentication.
              Production requires verified server sessions.
            </p>
          </div>
          <FieldLabel />
          <div className="role-options">
            {workspace.users
              .filter((u) => u.active)
              .map((u) => (
                <button
                  className={session.id === u.id ? "selected" : ""}
                  key={u.id}
                  onClick={() => {
                    setUserMenu(false);
                    switchUser(u.id);
                  }}
                >
                  <span className="avatar">
                    {u.name
                      .split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{u.name}</strong>
                    <small>{u.role}</small>
                  </div>
                  {session.id === u.id && <span>Current</span>}
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
function FieldLabel() {
  return <p className="section-label">Explore as</p>;
}
