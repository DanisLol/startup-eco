import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { DashboardView } from "@/components/parent/DashboardView";
import { ParentHomeView } from "@/components/parent/ParentHomeView";
import { getDemoParentHomeData } from "@/lib/demo-parent-dashboard";
import { getAuthenticatedParent, getParentHomeData } from "@/lib/parent-dashboard";

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const demoMode = process.env.NODE_ENV !== "production" && params.demo === "1";
  if (demoMode) {
    return <ParentHomeView data={getDemoParentHomeData()} email="demo-parent@pebble.local" demoMode />;
  }

  const parent = await getAuthenticatedParent();
  if (!parent) redirect("/parent/login");
  const data = await getParentHomeData();
  if (!data) return <DashboardView data={null} email={parent.email ?? "parent account"} />;
  return <ParentHomeView data={data} email={parent.email ?? "parent account"} />;
}
