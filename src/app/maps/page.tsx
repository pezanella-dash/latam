import { redirect } from "next/navigation";

export default function MapsRedirect() {
  redirect("/database?tab=maps");
}
