"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Save, User as UserIcon, Phone, Lock } from "lucide-react";

export default function ProfilePage() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setFormData(prev => ({ ...prev, name: user.name, phone: user.phone || "" }));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: any = { name: formData.name, phone: formData.phone };
            if (formData.password) payload.password = formData.password;

            const res = await api.put("/auth/profile", payload);
            
            // Update local storage
            const updatedUser = res.data;
            if(updatedUser.token) {
                 localStorage.setItem("token", updatedUser.token);
                 delete updatedUser.token;
            }
            localStorage.setItem("user", JSON.stringify(updatedUser));
            
            alert("Profile updated successfully!");
            router.refresh();
        } catch (error) {
            alert("Failed to update profile");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 pt-24">
            <Navbar />
            <div className="container mx-auto max-w-md">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <UserIcon className="w-5 h-5" /> Edit Profile
                        </CardTitle>
                        <CardDescription>Update your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                                <Input 
                                    id="name" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    className="bg-zinc-950 border-zinc-800 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> Phone Number
                                </Label>
                                <Input 
                                    id="phone" 
                                    name="phone" 
                                    value={formData.phone} 
                                    onChange={handleChange} 
                                    className="bg-zinc-950 border-zinc-800 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> New Password (Optional)
                                </Label>
                                <Input 
                                    id="password" 
                                    name="password" 
                                    type="password" 
                                    placeholder="Leave blank to keep current"
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    className="bg-zinc-950 border-zinc-800 text-white"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                            </Button>
                        </form>
                        
                        <div className="mt-8 pt-6 border-t border-zinc-800">
                             <h3 className="text-red-500 font-semibold mb-2 flex items-center gap-2">
                                 ⚠ Danger Zone
                             </h3>
                             <p className="text-sm text-gray-500 mb-4">
                                 Deleting your account is permanent. All your data and queue history will be removed.
                             </p>
                             <Button 
                                variant="destructive" 
                                className="w-full bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50"
                                onClick={async () => {
                                    if(confirm("Are you ABSOLUTELY sure? This cannot be undone.")) {
                                        try {
                                            await api.delete("/auth/profile");
                                            localStorage.removeItem("user");
                                            localStorage.removeItem("token");
                                            router.push("/");
                                        } catch(e) {
                                            alert("Failed to delete account");
                                        }
                                    }
                                }}
                            >
                                Delete Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
