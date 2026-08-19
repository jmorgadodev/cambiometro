import { redirect, RedirectType } from "next/navigation";

export default function FuncionariosRedirectPage() {
  redirect("/personas?tab=funcionarios", RedirectType.replace);
}
