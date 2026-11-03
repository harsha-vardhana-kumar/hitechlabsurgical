"use client";
import { useEffect, useRef, useState, useId, type ReactNode } from "react";
import { StatusBadge } from "@hitech/ui";
import {
  X,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
} from "lucide-react";
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow || "Website workspace"}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      <div className="actions">{actions}</div>
    </div>
  );
}
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <StatusBadge
      label={value}
      className={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}
    />
  );
}
export function Empty({
  title = "No records found",
  description = "Try another search or filter.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <PackageOpen size={30} strokeWidth={1.5} />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function ErrorSummary({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  return message ? (
    <div className="error-summary" role="alert" tabIndex={-1} ref={ref}>
      {message}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => before?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2 id={id}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export interface Column<T> {
  key: string;
  title: string;
  value: (r: T) => string | number;
  render?: (r: T) => ReactNode;
  primary?: boolean;
}
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  search,
  toolbar,
  selection,
  onSelection,
  emptyAction,
  initialSort,
  initialDescending = false,
}: {
  initialSort?: string;
  initialDescending?: boolean;
  rows: T[];
  columns: Column<T>[];
  search: (row: T) => string;
  toolbar?: ReactNode;
  selection?: string[];
  onSelection?: (ids: string[]) => void;
  emptyAction?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort || columns[0]?.key || "");
  const [descending, setDescending] = useState(initialDescending);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const filtered = rows.filter((r) =>
    search(r).toLowerCase().includes(query.toLowerCase()),
  );
  const column = columns.find((c) => c.key === sort);
  filtered.sort((a, b) => {
    const x = column?.value(a) ?? "",
      y = column?.value(b) ?? "";
    return (
      (typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y))) * (descending ? -1 : 1)
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * perPage, current * perPage);
  const all =
    visible.length > 0 && visible.every((r) => selection?.includes(r.id));
  return (
    <div className="data-table">
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search records"
            placeholder="Search records…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {toolbar}
        <span className="table-count">{filtered.length} records</span>
      </div>
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {onSelection && (
                  <th className="select-cell">
                    <input
                      type="checkbox"
                      aria-label="Select current page"
                      checked={all}
                      onChange={() =>
                        onSelection(
                          all
                            ? (selection || []).filter(
                                (id) => !visible.some((r) => r.id === id),
                              )
                            : [
                                ...new Set([
                                  ...(selection || []),
                                  ...visible.map((r) => r.id),
                                ]),
                              ],
                        )
                      }
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    aria-sort={
                      sort === c.key
                        ? descending
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <button
                      onClick={() => {
                        if (sort === c.key) setDescending(!descending);
                        else {
                          setSort(c.key);
                          setDescending(false);
                        }
                      }}
                    >
                      {c.title}
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  {onSelection && (
                    <td className="select-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${columns[0].value(row)}`}
                        checked={selection?.includes(row.id) || false}
                        onChange={() =>
                          onSelection(
                            selection?.includes(row.id)
                              ? selection.filter((id) => id !== row.id)
                              : [...(selection || []), row.id],
                          )
                        }
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      data-label={c.title}
                      className={c.primary ? "primary-cell" : ""}
                    >
                      {c.render ? c.render(row) : c.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{emptyAction}</Empty>
      )}
      <div className="pagination">
        <span>
          {filtered.length
            ? `${(current - 1) * perPage + 1}–${Math.min(current * perPage, filtered.length)} of ${filtered.length}`
            : "0 records"}
        </span>
        <label>
          Rows{" "}
          <select
            aria-label="Rows per page"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </label>
        <div className="actions">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
