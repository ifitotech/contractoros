import { redirect } from "next/navigation";

// There is no free-form purchase order any more: every purchase starts from a material list.
// Old links and bookmarks land on the Material page.
export default function NewPOPage() {
  redirect("/material");
}
