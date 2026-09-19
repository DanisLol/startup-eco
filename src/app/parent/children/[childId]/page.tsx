import { notFound, redirect } from "next/navigation";
import { DashboardView } from "@/components/parent/DashboardView";
import { DatabaseSetupNotice } from "@/components/parent/DatabaseSetupNotice";
import { getDemoParentDashboardData } from "@/lib/demo-parent-dashboard";
import { getAuthenticatedParent, getParentChildDashboardData, isParentDashboardSchemaError } from "@/lib/parent-dashboard";

export const dynamic = "force-dynamic";

export default async function ParentChildPage({ params, searchParams }: { params: Promise<{ childId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const [{ childId }, query] = await Promise.all([params, searchParams]);
  const demoMode = process.env.NODE_ENV !== "production" && query.demo === "1";
  if (demoMode && childId === "demo-child") return <DashboardView data={getDemoParentDashboardData()} email="demo-parent@pebble.local" demoMode />;

  const parent = await getAuthenticatedParent();
  if (!parent) redirect("/parent/login");

  let data;
  try {
    data = await getParentChildDashboardData(childId);
  } catch (error) {
    if (isParentDashboardSchemaError(error)) return <DatabaseSetupNotice />;
    throw error;
  }
  if (!data) notFound();
  return <DashboardView data={data} email={parent.email ?? "parent account"} />;
}
