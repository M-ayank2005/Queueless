"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/login", { email, password });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user)); // Store basic user info
            
            if (res.data.user.role === "business") {
                router.push("/dashboard");
            } else {
                router.push("/"); // Or where customer goes
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                        <CardDescription>Enter your email to sign in to your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="grid gap-4">
                            {error && <div className="text-red-500 text-sm center">{error}</div>}
                            <div className="grid gap-2">
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    className="bg-zinc-900 border-zinc-800" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Input 
                                    id="password" 
                                    type="password" 
                                    placeholder="Password" 
                                    className="bg-zinc-900 border-zinc-800" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                {loading ? "Signing In..." : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center text-sm text-gray-500">
                        <p>
                            Don't have an account?{" "}
                            <Link href="/register" className="underline hover:text-white">
                                Sign up
                            </Link>
                        </p>
                        <Link href="/" className="text-xs hover:text-white">
                            Back to Home
                        </Link>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
