import { notFound } from "next/navigation";
import { RouteView } from "../../components/route-view";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const [root, second] = path;
  const valid =
    path.length === 0 ||
    (["products", "categories", "content"].includes(root) &&
      path.length <= 2) ||
    (["media", "featured", "activity", "publishing"].includes(root) &&
      path.length === 1) ||
    (root === "enquiries" &&
      ["quotes", "contacts"].includes(second) &&
      path.length <= 3) ||
    (root === "seo" &&
      ["products", "pages"].includes(second) &&
      path.length === 2) ||
    (root === "settings" &&
      ["business", "contact", "website", "brand", "users"].includes(second) &&
      path.length === 2);
  if (!valid) notFound();
  return <RouteView path={path} />;
}
