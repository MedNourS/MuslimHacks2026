import { AuthShell } from "../components/shared/AuthShell";
import { LoginForm } from "../components/login/LoginForm";

export default function Login() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
