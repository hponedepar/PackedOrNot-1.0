import { redirect } from "next/navigation";

// /settings on its own just opens the first section.
export default function SettingsIndex() {
  redirect("/settings/account");
}
