"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for user in localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full fixed top-0 left-0 bg-black/50 backdrop-blur-md border-b border-white/10 z-50 py-4"
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          QueueLess
        </Link>
                <div className="flex items-center gap-4">
                    <Link href="/scan">
                        <Button variant="outline" className="text-black border-zinc-700 hover:bg-zinc-800 hover:text-white">
                            Scan QR
                        </Button>
                    </Link>
                    
                    {user ? (
                        <>
                             {user.role === 'business' && (
                                <Link href="/dashboard">
                                    <Button variant="ghost" className="text-gray-300 hover:text-white">Dashboard</Button>
                                </Link>
                             )}
                            <Button variant="ghost" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                Logout
                            </Button>
                            <Link href="/profile">
                                <Button variant="ghost" className="text-gray-300 hover:text-white">Profile</Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-300 hover:text-white">Login</Button>
                            </Link>
                            <Link href="/register">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
                            </Link>
                        </>
                    )}
                </div>
      </div>
    </motion.nav>
  );
}
