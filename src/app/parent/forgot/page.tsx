import Link from "next/link";
import { AuthForm } from "@/components/parent/AuthForm";
import { AuthShell } from "../login/page";

export default function ParentForgotPage() {
  return <AuthShell title="Reset your password" description="We will send a secure reset link if that email has a Pebble account."><AuthForm mode="forgot" /><p className="mt-5 text-sm text-stone"><Link href="/parent/login" className="font-semibold text-creek">Back to login</Link></p></AuthShell>;
}
