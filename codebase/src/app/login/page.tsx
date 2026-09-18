import Link from "next/link";
import { SignIn } from "@/frontend/sign-in";
export default function Login() {
  return (
    <main className="standalone">
      <Link href="/">Back to preview</Link>
      <h1>Sign in to your cohort</h1>
      <p className="muted">
        Use your provisioned course account. Your cohort membership determines
        your role.
      </p>
      <SignIn />
    </main>
  );
}
