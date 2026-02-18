"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, Users, ArrowLeft, CheckCircle, XCircle, Home, CreditCard } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000");

export default function StatusPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [queueData, setQueueData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Request Notification Permission
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        fetchStatus();
        
        // Socket listeners
        socket.emit("join_queue", params.id);
        
        socket.on("status_updated", (updatedEntry: any) => {
             console.log("Status Updated:", updatedEntry);
             if(updatedEntry._id === params.id) {
                 fetchStatus();
                 
                 // Trigger Notification
                 if (updatedEntry.status === 'completed' && Notification.permission === "granted") {
                     new Notification("Your Turn!", {
                         body: "You are being served now. Please proceed to the counter.",
                         icon: "/icon.png" // Optional
                     });
                 }
             }
        });

        // NOTE: We could also listen for "queue_updated" (general business) to update peopleAhead
        // and notify if (peopleAhead === 1) "You are next!"
        // For MVP, status_updated (completed) is the most critical one.

        const interval = setInterval(fetchStatus, 30000); 

        return () => {
            socket.off("status_updated");
            clearInterval(interval);
        };
    }, [params.id]);

    const fetchStatus = async () => {
        try {
            const res = await api.get(`/queue/status/${params.id}`);
            setQueueData(res.data);
        } catch (error) {
            console.error("Error fetching status", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to leave the queue?")) return;
        try {
            await api.post("/queue/cancel", { queueId: params.id });
            router.push("/");
        } catch (error) {
            console.error(error);
        }
    };
    
    // Simple mock payment handler for the button
    const handlePayNow = () => {
        alert(`Redirecting to payment gateway for $${queueData?.selectedServices?.reduce((acc:any, s:any) => acc + s.cost, 0)}... (Mock)`);
        // In real app, this would open a Stripe/Razorpay modal
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Status...</div>;
    if (!queueData) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Queue Entry Not Found</div>;

    const peopleAhead = queueData.peopleAhead || 0;
    const waitTime = queueData.currentEstimatedWait || 0;
    const ticketId = queueData._id.slice(-6).toUpperCase(); // Simple ticket ID from Mongo ID

    return (
        <div className="min-h-screen bg-black text-white flex flex-col p-6">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full mt-12">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                            You're in the queue!
                        </h1>
                        <p className="text-gray-400">Sit back and relax.</p>
                    </div>

                    <Card className="bg-zinc-900 border-zinc-800 w-full mb-6">
                        <CardHeader className="text-center border-b border-zinc-800 pb-6">
                            <CardTitle className="text-sm uppercase tracking-widest text-gray-500 mb-2">Your Ticket</CardTitle>
                            <div className="text-5xl font-mono text-blue-400">#{ticketId}</div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="border-r border-zinc-800">
                                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                    <div className="text-2xl font-bold text-white">{peopleAhead}</div>
                                    <div className="text-xs text-gray-500 uppercase mt-1">People Ahead</div>
                                </div>
                                <div>
                                    <Clock className="w-6 h-6 mx-auto mb-2 text-pink-500" />
                                    <div className="text-2xl font-bold text-white">{waitTime}</div>
                                    <div className="text-xs text-gray-500 uppercase mt-1">Mins Wait</div>
                                </div>
                            </div>
                        </CardContent>
                        {queueData.status === 'completed' && (
                             <div className="p-4 bg-green-900/20 text-green-400 text-center font-bold border-t border-green-900/50">
                                 Your turn has completed!
                             </div>
                        )}
                         {queueData.status === 'cancelled' && (
                             <div className="p-4 bg-red-900/20 text-red-400 text-center font-bold border-t border-red-900/50">
                                 This booking was cancelled.
                             </div>
                        )}
                    </Card>

                    <div className="space-y-4">
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700" 
                            onClick={handlePayNow}
                        >
                            Pay Now
                        </Button>
                        
                        {(queueData.status !== 'completed' && queueData.status !== 'cancelled') && (
                            <Button 
                                variant="outline" 
                                className="w-full border-zinc-800 text-red-400 hover:bg-red-950/30 hover:text-red-300 hover:border-red-900"
                                onClick={handleCancel}
                            >
                                Cancel My Spot
                            </Button>
                        )}
                        
                        <Link href="/">
                            <Button variant="ghost" className="w-full text-gray-400 hover:text-white">Back to Home</Button>
                        </Link>
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
