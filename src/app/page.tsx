"use client";

import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { signInEmail, fetchSession, clearError } from "@/lib/slices/authSlice";

type LoginFormData = {
  email: string;
  password: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.6, -0.05, 0.01, 0.99] as const,
    },
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  // Fetch session on mount
  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    dispatch(clearError());
    const result = await dispatch(signInEmail({ email: data.email, password: data.password }));
    
    if (signInEmail.fulfilled.match(result)) {
      // Redirect on success
      router.push("/dashboard"); // or wherever you want to redirect
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background glow with neon red */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 5,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{
          background:
            "radial-gradient(circle at 20% 50%, rgba(255, 7, 58, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 23, 68, 0.2) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(255, 69, 105, 0.15) 0%, transparent 60%)",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Floating neon particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2 + "px",
            height: Math.random() * 4 + 2 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            backgroundColor: `rgba(255, ${7 + i * 5}, ${58 + i * 3}, 0.6)`,
            boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(255, 7, 58, 0.5)`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.5, 1],
            boxShadow: [
              `0 0 ${Math.random() * 10 + 5}px rgba(255, 7, 58, 0.5)`,
              `0 0 ${Math.random() * 20 + 10}px rgba(255, 23, 68, 0.8)`,
              `0 0 ${Math.random() * 10 + 5}px rgba(255, 7, 58, 0.5)`,
            ],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        className="relative z-10 w-full max-w-md px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="text-center mb-8">
          <motion.h1
            className="text-5xl font-bold mb-2 bg-gradient-to-r from-[#ff073a] via-[#ff1744] to-[#ff4569] bg-clip-text text-transparent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
          >
            BeerPong
            <span className="block text-2xl font-normal text-white/90 mt-1">
              Tracker
            </span>
          </motion.h1>
          <motion.p
            className="text-white/70 text-sm mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Track your games and stream with OBS integration
          </motion.p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-[#0a0a0a] border-[#ff073a]/30 backdrop-blur-sm shadow-2xl shadow-[#ff073a]/10">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold text-white">
                Sign In
              </CardTitle>
              <CardDescription className="text-white/60">
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <motion.div
                  variants={itemVariants}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-white/90">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a] focus:ring-[#ff073a]/30 transition-all"
                    {...register("email", {
                      required: "Email address is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-[#ff4569]"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-[#ff4569]"
                    >
                      {error}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="space-y-2"
                >
                  <Label htmlFor="password" className="text-white/90">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-white/5 border-[#ff073a]/30 text-white placeholder:text-white/40 focus:border-[#ff073a] focus:ring-[#ff073a]/30 transition-all"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                  />
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-[#ff4569]"
                    >
                      {errors.password.message}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#ff073a] to-[#ff1744] text-white hover:from-[#ff1744] hover:to-[#ff4569] font-medium transition-all duration-300 shadow-lg shadow-[#ff073a]/30 hover:shadow-[#ff1744]/50 hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-6 text-center"
        >
          <p className="text-sm text-white/50">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-[#ff073a] hover:text-[#ff1744] underline underline-offset-4 transition-colors font-medium"
            >
              Sign up here
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
