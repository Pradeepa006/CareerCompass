import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      setLocation("/dashboard");
    },
    onError: (err) => {
      setError(err.message || "An unexpected error occurred.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    setError(null);
    loginMutation.mutate({ username: username.trim() });
  };

  return (
    <div className="min-h-screen bg-slate-50 page-grid grid place-items-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center gap-3 justify-center mb-10">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17233c] text-white shadow-xl shadow-blue-900/10 transition-transform hover:scale-105 duration-300">
            <Sparkles size={20} />
          </span>
          <span className="display text-2xl font-extrabold text-[#17233c]">CareerCompass</span>
        </Link>
        
        <div className="soft-card rounded-[2rem] bg-white p-8 md:p-10 shadow-2xl shadow-slate-200/50 border border-white">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#dbe9ff] text-[#24579f] shadow-inner">
            <Compass size={28} />
          </div>
          <h1 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-3 text-center text-slate-500 mb-8">
            Sign in to your account to continue building your career roadmap.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. pradeepa"
                className="w-full px-4 py-6 rounded-xl border-slate-200 bg-slate-50 text-base shadow-inner focus:bg-white transition-colors"
                disabled={loginMutation.isPending}
              />
            </div>
            
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full rounded-xl py-6 text-base font-semibold shadow-xl shadow-[#111827]/10 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#111827]/20 active:scale-95"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Continue to workspace"}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
