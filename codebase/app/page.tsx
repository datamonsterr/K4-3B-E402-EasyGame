import { redirect } from "next/navigation";

export default function Home() {
  // Requirement 1: First page must redirect to /sign-in
  redirect("/sign-in");
}
