import { redirect, RedirectType } from "next/navigation";

export default function AutoridadesRedirectPage() {
  redirect("/personas?tab=parlamentarios", RedirectType.replace);
}
