import { LogsTable } from "@/components/logs-table";

export default function LogsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="my-8 space-y-4">
        <h1 className="text-3xl font-bold">Notification Logs</h1>
        <p className="text-muted-foreground">
          View a history of all notifications sent by TweetWatcher
        </p>
      </div>
      <LogsTable />
    </div>
  );
}