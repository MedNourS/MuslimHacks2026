import { AuthShell } from "../components/shared/AuthShell";
import { SignUpForm } from "../components/signup/SignUpForm";

export default function SignUp() {
  return (
    <AuthShell>
      <SignUpForm />
    </AuthShell>
  );
}
