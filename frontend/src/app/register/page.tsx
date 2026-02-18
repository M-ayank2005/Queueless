"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

// Simple Tabs implementation since I didn't create ui/tabs.tsx yet
function SimpleTabs({ defaultValue, children, onValueChange }: any) {
    const [value, setValue] = useState(defaultValue);
    return (
        <div className="w-full">
            <div className="flex space-x-2 bg-secondary p-1 rounded-md mb-6">
                {["customer", "business"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setValue(tab); onValueChange?.(tab); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-sm transition-all ${value === tab ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
            {children(value)}
        </div>
    );
}

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const defaultRole = searchParams.get("role") === "business" ? "business" : "customer";
    const [role, setRole] = useState(defaultRole);
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", password: "", businessName: "", address: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (currentRole: string, e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                role: currentRole,
                // Only send business props if role is business
                ...(currentRole === "business" ? { businessName: formData.businessName, address: formData.address } : {})
            };
            
            const res = await api.post("/auth/register", payload);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            if (currentRole === "business") {
                router.push("/dashboard");
            } else {
                router.push("/");
            }
        } catch (error: any) {
             alert(error.response?.data?.message || "Registration failed");
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
                        <CardTitle className="text-2xl text-white">Create an account</CardTitle>
                        <CardDescription>Enter your details below to create your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SimpleTabs defaultValue={role} onValueChange={setRole}>
                            {(currentRole: string) => (
                                <form onSubmit={(e) => handleRegister(currentRole, e)} className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Input id="name" placeholder="Full Name" className="bg-zinc-900 border-zinc-800" onChange={handleChange} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Input id="email" type="email" placeholder="name@example.com" className="bg-zinc-900 border-zinc-800" onChange={handleChange} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Input id="phone" type="tel" placeholder="Phone Number" className="bg-zinc-900 border-zinc-800" onChange={handleChange} required />
                                    </div>
                                    {currentRole === "business" && (
                                        <>
                                            <div className="grid gap-2">
                                                <Input id="businessName" placeholder="Business Name" className="bg-zinc-900 border-zinc-800" onChange={handleChange} required />
                                            </div>
                                            <div className="grid gap-2">
                                                <Input id="address" placeholder="Business Address" className="bg-zinc-900 border-zinc-800" onChange={handleChange} required />
                                            </div>
                                        </>
                                    )}
                                    <div className="grid gap-2">
                                        <Input id="password" type="password" placeholder="Password" className="bg-zinc-900 border-zinc-800" onChange={handleChange} required />
                                    </div>
                                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                        {loading ? "Creating Account..." : `Sign Up as ${currentRole === "business" ? "Business" : "Customer"}`}
                                    </Button>
                                </form>
                            )}
                        </SimpleTabs>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center text-sm text-gray-500">
                        <p>
                            Already have an account?{" "}
                            <Link href="/login" className="underline hover:text-white">
                                Login
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
