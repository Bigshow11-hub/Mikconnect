import { redirect } from "next/navigation";

export default function OnlineUsersLegacyPage() {
  redirect("/network#sessions");
}
