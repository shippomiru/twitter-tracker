import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="my-8 space-y-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure which Twitter accounts to monitor and how you want to be notified
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}