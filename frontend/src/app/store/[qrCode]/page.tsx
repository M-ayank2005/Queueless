"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // Correct for App Router
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, CreditCard, Check } from "lucide-react";
import api from "@/lib/api";

export default function StorePage() {
    const params = useParams();
    const qrCode = params.qrCode as string;
    const router = useRouter();

    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [showPayment, setShowPayment] = useState(false);
    const [userName, setUserName] = useState(""); // Simple name input for now if not logged in

    useEffect(() => {
        if (qrCode) {
            fetchStore();
        }
    }, [qrCode]);

    const fetchStore = async () => {
        try {
            const res = await api.get(`/queue/store/${qrCode}`);
            setStore(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch store", error);
            setLoading(false);
        }
    };

    const toggleService = (index: number) => {
        if (selectedServices.includes(index)) {
            setSelectedServices(selectedServices.filter(i => i !== index));
        } else {
            setSelectedServices([...selectedServices, index]);
        }
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Store...</div>;
    if (!store) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Store not found</div>;

    const servicesList = store.businessProfile?.services || [];
    const totalCost = selectedServices.reduce((acc, idx) => acc + (servicesList[idx]?.cost || 0), 0);
    const totalTime = selectedServices.reduce((acc, idx) => acc + (servicesList[idx]?.durationMin || 0), 0);

    const handleJoinQueue = async () => {
        if (selectedServices.length === 0) return;
        
        try {
             const selectedServiceObjects = selectedServices.map(idx => servicesList[idx]);
             const res = await api.post("/queue/join", {
                 businessId: store._id,
                 selectedServices: selectedServiceObjects
             });
             
            router.push(`/status/${res.data._id}`);
        } catch (error: any) {
             console.error("Join Failed", error);
             if (error.response?.status === 401) {
                 alert("Please login to join the queue");
                 router.push("/login");
             } else {
                 alert("Failed to join queue");
             }
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 pt-24">
            <Navbar />
            <div className="container mx-auto max-w-2xl">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <Card className="bg-zinc-900 border-zinc-800 mb-6">
                        <CardHeader>
                            <CardTitle className="text-2xl text-white">{store.businessProfile?.shopName}</CardTitle>
                            <CardDescription className="text-gray-400">{store.businessProfile?.address}</CardDescription>
                        </CardHeader>
                    </Card>

                    <h2 className="text-lg font-semibold mb-4 text-gray-200">Select Services</h2>
                    
                    <div className="space-y-3 mb-8">
                        {servicesList.map((service: any, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => toggleService(idx)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${selectedServices.includes(idx) ? 'bg-blue-900/20 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedServices.includes(idx) ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                        {selectedServices.includes(idx) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{service.name}</p>
                                        <p className="text-sm text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {service.durationMin} min
                                        </p>
                                    </div>
                                </div>
                                <span className="font-bold text-white">${service.cost}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-0 left-0 w-full bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 p-6">
                        <div className="container mx-auto max-w-2xl flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-400">{totalTime} min estimated</p>
                                <p className="text-xl font-bold text-white">Total: ${totalCost}</p>
                            </div>
                            <Button 
                                size="lg" 
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50" 
                                disabled={selectedServices.length === 0}
                                onClick={handleJoinQueue}
                            >
                                Join Queue
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
