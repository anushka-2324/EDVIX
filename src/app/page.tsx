import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export default async function HomePage() {
  const { user } = await getAuthContext();
  redirect(user ? "/dashboard" : "/login");
}
