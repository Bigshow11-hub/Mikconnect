import { OnlineUsersPanel } from "@/features/routers/online-users-panel";

export default function OnlineUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.035em] text-ink">Sessions en ligne</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">Une vue opérationnelle de tous les appareils connectés à vos WiFi Zones.</p>
      </header>
      <OnlineUsersPanel limit={Number.POSITIVE_INFINITY} dedicated />
    </div>
  );
}
