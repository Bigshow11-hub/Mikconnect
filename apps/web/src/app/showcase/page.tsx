import { redirect } from "next/navigation";

/** La page de données de démonstration n'est jamais exposée au produit réel. */
export default function ShowcasePage() {
  redirect("/");
}
