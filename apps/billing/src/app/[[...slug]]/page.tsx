import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Dashboard } from "../../components/dashboard";
import { Parties, Products } from "../../components/records";
import { Documents } from "../../components/documents";
import { Payments, Inventory, Expenses } from "../../components/operations";
import { Reports } from "../../components/reports";
import { Settings } from "../../components/settings";
import { documentPaths, type DocumentKind } from "../../domain/types";
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  if (!slug.length) redirect("/dashboard");
  const [module, second, third, fourth] = slug;
  if (module === "dashboard" && slug.length === 1) return <Dashboard />;
  if (
    ["customers", "suppliers", "products", "expenses"].includes(module) &&
    slug.length <= 3 &&
    (!third || third === "edit")
  ) {
    const props = { id: second, edit: third === "edit" };
    if (module === "products") return <Products {...props} />;
    if (module === "expenses") return <Expenses {...props} />;
    return (
      <Parties
        kind={module === "customers" ? "customer" : "supplier"}
        {...props}
      />
    );
  }
  if (
    ["sales", "purchases"].includes(module) &&
    second === "payments" &&
    slug.length <= 3 &&
    (!third || third === "new")
  )
    return (
      <Suspense fallback={<p>Loading payments…</p>}>
        <Payments
          direction={module === "sales" ? "received" : "made"}
          create={third === "new"}
        />
      </Suspense>
    );
  const kind = (Object.keys(documentPaths) as DocumentKind[]).find(
    (k) => documentPaths[k] === `/${module}/${second}`,
  );
  if (kind && slug.length <= 4 && (!fourth || fourth === "edit"))
    return <Documents kind={kind} id={third} edit={fourth === "edit"} />;
  if (module === "inventory") {
    if (!second && slug.length === 1) return <Inventory />;
    if (["movements", "low-stock"].includes(second) && slug.length === 2)
      return <Inventory section={second} />;
    if (
      second === "batches" &&
      slug.length <= 4 &&
      (!fourth || fourth === "edit")
    )
      return <Inventory section={second} id={third} edit={fourth === "edit"} />;
    if (
      second === "adjustments" &&
      slug.length <= 3 &&
      (!third || third === "new")
    )
      return <Inventory section={second} id={third} />;
  }
  if (module === "reports" && slug.length === 1) return <Reports />;
  if (
    module === "settings" &&
    slug.length <= 2 &&
    (!second ||
      [
        "profile",
        "tax",
        "documents",
        "numbering",
        "banking",
        "preferences",
        "workspace",
      ].includes(second))
  )
    return <Settings section={second} />;
  notFound();
}
