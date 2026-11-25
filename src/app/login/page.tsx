import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | Neeleh Academy",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    const isStaff = user.roles.some((r) => ["ADMIN", "EDITOR"].includes(r));
    redirect(isStaff ? "/dashboard/" : "/panel/");
  }

  return <LoginForm />;
}
