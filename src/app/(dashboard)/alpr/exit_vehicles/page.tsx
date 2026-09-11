import { redirect } from "next/navigation";

export default function Page() {
  redirect("/alpr/overview?direction=exit");
}
