import { redirect } from "next/navigation";

/** The old buyer portal now lives in the Member Area. */
export default function LegacyPortalPage() {
  redirect("/member");
}
