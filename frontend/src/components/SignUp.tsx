"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sticker } from "./Sticker";
import { Rocket, Sparkles, Heart, Github, Mail, Lock, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:7830/user/signup", {
        username: name,
        email,
        password,
      });
      console.log("Sign up success:", response.data);
      // Redirect to signin or dashboard
      router.push("/signin");
    } catch (error) {
      console.error("Sign up failed:", error);
      alert("Sign up failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background square-grid flex items-center justify-center py-12 px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/15 rounded-full blur-3xl" />
      </div>

      {/* Floating stickers */}
      <div className="absolute top-20 right-[10%] hidden lg:block">
        <Sticker icon={Rocket} color="secondary" size="md" rotation={15} />
      </div>
      <div className="absolute bottom-40 left-[15%] hidden lg:block">
        <Sticker icon={Sparkles} color="primary" size="lg" rotation={-20} />
      </div>
      <div className="absolute top-1/2 right-[20%] hidden lg:block">
        <Sticker icon={Heart} color="destructive" size="md" rotation={10} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Main card */}
        <div
          className="bg-card border-2 border-secondary/30 rounded-3xl p-8 md:p-10 shadow-2xl transform hover:rotate-0 transition-all"
          style={{ transform: 'rotate(0.5deg)' }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-2xl mb-4 shadow-lg border-2 border-white/30">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h2 className="mb-2">Join DeployHub! 🚀</h2>
            <p className="text-muted-foreground">
              Start deploying in seconds ✨
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-secondary" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-2 border-secondary/20 focus:border-secondary rounded-xl h-12"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-secondary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-secondary/20 focus:border-secondary rounded-xl h-12"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-secondary" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 border-secondary/20 focus:border-secondary rounded-xl h-12"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 rounded border-2 border-secondary/30" required />
              <span className="text-muted-foreground">
                I agree to the{" "}
                <a href="#" className="text-secondary hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-secondary hover:underline">Privacy Policy</a>
              </span>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all bg-secondary hover:bg-secondary/90"
            >
              Create Account 🎉
            </Button>


            {/* to-do: add divider */}
            {/* Divider */}
            {/* 
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">or sign up with</span>
              </div>
            </div>
            */}

            {/* to-do: add social signup */}
            {/* Social signup */}
            {/* 
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                className="border-2 border-border hover:border-secondary/50 h-12 transform hover:scale-105 transition-all"
              >
                <Github className="w-5 h-5 mr-2" />
                GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-2 border-border hover:border-secondary/50 h-12 transform hover:scale-105 transition-all"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
            </div>
            */}
          </form>

          {/* Sign in link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/signin" className="text-secondary hover:underline font-medium">
              Sign in here!
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}