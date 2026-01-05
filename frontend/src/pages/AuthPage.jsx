import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Card } from "../components/common/Card";
import { ROUTES } from "../utils/constants";

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();

  const [isLogin, setIsLogin] = useState(!location.pathname.includes("signup"));
  const [loading, setLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(ROUTES.CHAT, { replace: true, state: { newChat: true } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const formatErrorMessage = (error, defaultMsg) => {
    try {
      console.log("Auth Error:", error);
      const detail = error.response?.data?.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail.map((d) => d.msg).join(", ");
      }
      if (detail && typeof detail === "object") {
        return Object.values(detail).join(", ");
      }
      return defaultMsg;
    } catch (e) {
      console.error("Error formatting message:", e);
      return defaultMsg;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log(
      "Attempting login to:",
      import.meta.env.VITE_API_URL || "https://documind-p046.onrender.com"
    );

    try {
      await login(username, password);
      navigate(ROUTES.CHAT, { state: { newChat: true } });
    } catch (error) {
      console.error("Login error:", error);
      showToast({
        type: "error",
        message: formatErrorMessage(
          error,
          "Login failed. Please check your credentials."
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast({ type: "error", message: "Passwords do not match" });
      return;
    }

    if (password.length < 6) {
      showToast({
        type: "error",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);

    try {
      await signup({ username, email, password });
      showToast({
        type: "success",
        message: "Account created successfully! You can now sign in.",
      });
      setIsLogin(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Signup error:", error);
      showToast({
        type: "error",
        message: formatErrorMessage(error, "Signup failed. Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center px-4 overflow-hidden">
      <div
        className={`w-full max-w-md flex flex-col ${
          isLogin ? "scale-90" : "scale-[0.82]"
        }`}
      >
        {/* Return to Home Button */}
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-md border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-white transition-all group self-start shadow-sm"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">
            Return home
          </span>
        </button>

        {/* Logo - Optimized for the vertical image provided with curved border */}
        <div className="flex flex-col items-center mb-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <img
              src="/brand-logo.png"
              alt="QueryWise"
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>

        <Card padding="lg">
          <div className="mb-4 pb-2 border-b border-slate-100 flex gap-8 justify-center">
            <button
              onClick={() => setIsLogin(true)}
              className={`text-lg font-bold transition-all ${
                isLogin
                  ? "text-slate-900 border-b-2 border-orange-500 -mb-[9px]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`text-lg font-bold transition-all ${
                !isLogin
                  ? "text-slate-900 border-b-2 border-orange-500 -mb-[9px]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Create Account
            </button>
          </div>

          <p className="text-slate-600 mb-4 text-sm">
            {isLogin
              ? "Welcome back! Sign in to continue."
              : "Join QueryWise to start chatting with your documents."}
          </p>

          <form
            onSubmit={isLogin ? handleLogin : handleSignup}
            className={isLogin ? "space-y-3" : "space-y-2.5"}
          >
            <Input
              label="Username"
              type="text"
              placeholder={
                isLogin ? "Enter your username" : "Choose a username"
              }
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            {!isLogin && (
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <Input
              label="Password"
              type="password"
              placeholder={
                isLogin ? "Enter your password" : "Create a password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {!isLogin && (
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-1 py-2.5"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(false)}
                className="text-sm text-slate-500 hover:text-orange-600 transition-colors"
              >
                Don't have an account?{" "}
                <span className="text-orange-500 font-bold">Sign up</span>
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
