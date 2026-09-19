import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/parent/AuthForm";
import { getAuthenticatedParent } from "@/lib/parent-dashboard";
import { AuthShell } from "../login/page";

export const dynamic = "force-dynamic";

export default async function ParentSignupPage() {
  if (await getAuthenticatedParent()) redirect("/parent");
  return <AuthShell title="Make a parent account" description="Your account keeps your family's learning updates in one safe place."><AuthForm mode="signup" /><p className="mt-5 text-sm text-stone">Already have an account? <Link href="/parent/login" className="font-semibold text-creek">Log in</Link></p></AuthShell>;
}
