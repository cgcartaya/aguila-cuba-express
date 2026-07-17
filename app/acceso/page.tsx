import { redirect } from "next/navigation";

export default function OperationsAccessPage() {
  redirect("/login?next=/admin/shipping");
}
