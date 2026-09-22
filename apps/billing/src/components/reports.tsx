"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { useWorkspace } from "./provider";
import {
  buildReport,
  reportCsv,
  reportNames,
  type ReportKind,
  type ReportRow,
} from "../services/reports";
import {
  dateRange,
  today,
  money,
  validDate,
  type DateRange,
} from "../domain/dates";
import { PageHeader, Panel, DataTable, Field, ErrorSummary } from "./ui";
export function Reports() {
  const { w } = useWorkspace(),
    [kind, setKind] = useState<ReportKind>("sales"),
    [preset, setPreset] = useState<DateRange>("month"),
    [customFrom, setFrom] = useState(""),
    [customTo, setTo] = useState("");
  const [from, to] =
      preset === "custom"
        ? [customFrom, customTo]
        : dateRange(preset, today(), w.settings.financialYearStart),
    valid =
      (!from || validDate(from)) &&
      (!to || validDate(to)) &&
      (!from || !to || from <= to),
    report = buildReport(w, kind, from, to);
  const value = (r: ReportRow, i: number) =>
    report.columns[i].type === "money"
      ? money(Number(r.cells[i]))
      : String(r.cells[i]);
  function download() {
    const url = URL.createObjectURL(
      new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `hitech-${kind}-${from || "all"}-${to || "all"}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return (
    <>
      <PageHeader
        title="Reports"
        eyebrow="Business insights"
        description="Explore sales, purchases, expenses and inventory."
        actions={
          <>
            <button
              className="secondary"
              disabled={!valid}
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Print report
            </button>
            <button disabled={!valid} onClick={download}>
              <Download size={15} />
              Export CSV
            </button>
          </>
        }
      />
      <Panel className="no-print">
        <div className="report-controls">
          <Field label="Report">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ReportKind)}
            >
              {Object.entries(reportNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Period">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DateRange)}
            >
              {[
                ["today", "Today"],
                ["week", "This week"],
                ["month", "This month"],
                ["quarter", "This quarter"],
                ["financial-year", "Financial year"],
                ["all", "All dates"],
                ["custom", "Custom dates"],
              ].map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          {preset === "custom" && (
            <>
              <Field label="From">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </>
          )}
        </div>
      </Panel>
      <ErrorSummary
        message={
          valid
            ? ""
            : "Enter a valid date range. The start date must not follow the end date."
        }
      />
      <Panel title={reportNames[kind]} className="no-print">
        <p className="report-note">{report.note}</p>
        {valid && (
          <DataTable<ReportRow>
            key={kind}
            rows={report.rows}
            search={(r) => r.cells.join(" ")}
            columns={report.columns.map((c, i) => ({
              key: String(i),
              title: c.title,
              value: (r) => r.cells[i],
              render: (r) => value(r, i),
              align: c.type ? ("right" as const) : undefined,
            }))}
          />
        )}
      </Panel>
      <div className="print-report">
        <p>Hitech Lab & Surgical Solutions · DEMO WORKSPACE</p>
        <h2>{reportNames[kind]}</h2>
        <p>
          {from || "All dates"} — {to || today()}
        </p>
        <p>{report.note}</p>
        <table>
          <thead>
            <tr>
              {report.columns.map((c) => (
                <th key={c.title}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.id}>
                {r.cells.map((_, i) => (
                  <td key={i}>{value(r, i)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
