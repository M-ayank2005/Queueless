"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, CheckCircle, XCircle, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { io } from "socket.io-client";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000");

export default function Dashboard() {
    const [services, setServices] = useState<any[]>([]);
    const [queue, setQueue] = useState<any[]>([]);
    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const [newService, setNewService] = useState({ name: "", durationMin: "", cost: "" });
    const router = useRouter();

    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        shopName: "",
        address: "",
        openTime: "09:00",
        closeTime: "17:00",
        closedDays: [] as number[]
    });

    useEffect(() => {
        fetchData();
        
        // Socket listeners
        socket.on("connect", () => {
            console.log("Connected to socket");
        });

        socket.on("queue_updated", (data: any) => {
            console.log("Queue Update Received:", data);
            fetchData(); // Simplest strategy: refetch data on event
        });

        return () => {
            socket.off("connect");
            socket.off("queue_updated");
        };
    }, []);

    // Join room when profile is loaded
    useEffect(() => {
        if (businessProfile?._id) {
             socket.emit("join_business", businessProfile._id);
        }
    }, [businessProfile]);

    const fetchData = async () => {
        try {
            const profileRes = await api.get("/business/me");
            setBusinessProfile(profileRes.data);
            setServices(profileRes.data.services || []);
            
            // Populating settings form
            if (profileRes.data) {
                 setSettingsForm({
                    shopName: profileRes.data.shopName || "",
                    address: profileRes.data.address || "",
                    openTime: profileRes.data.workingHours?.openTime || "09:00",
                    closeTime: profileRes.data.workingHours?.closeTime || "17:00",
                    closedDays: profileRes.data.workingHours?.closedDays || []
                 });
            }

            const queueRes = await api.get("/business/queue");
            setQueue(queueRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            // router.push("/login"); // Redirect if unauthorized
        }
    };

    const addService = async () => {
        if (!newService.name || !newService.durationMin || !newService.cost) return;
        const updatedServices = [...services, {
            name: newService.name,
            durationMin: Number(newService.durationMin),
            cost: Number(newService.cost)
        }];
        
        try {
            const res = await api.put("/business/services", { services: updatedServices });
            setServices(res.data.services);
            setNewService({ name: "", durationMin: "", cost: "" });
        } catch (error) {
            alert("Failed to update services");
        }
    };

    const removeService = async (index: number) => {
        const updatedServices = [...services];
        updatedServices.splice(index, 1);
        try {
            const res = await api.put("/business/services", { services: updatedServices });
            setServices(res.data.services);
        } catch (error) {
            alert("Failed to remove service");
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.put(`/business/queue/${id}/status`, { status });
            fetchData();
        } catch (error) {
            console.error("Update failed");
        }
    };

    if (!businessProfile && services.length === 0) return <div className="p-10 text-center text-white">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-6 pt-24">
            <Navbar />
            
            <div className="container mx-auto max-w-6xl">
                <h1 className="text-3xl font-bold mb-8">Business Dashboard: {businessProfile?.shopName}</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Queue Management */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <Card className="bg-zinc-900 border-zinc-800 h-full">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center text-white">
                                    Current Queue
                                    <span className="text-sm font-normal text-gray-400 bg-zinc-800 px-3 py-1 rounded-full">
                                        {queue.filter(q => q.status === 'waiting' || q.status === 'in_progress').length} Active
                                    </span>
                                </CardTitle>
                                <CardDescription>Manage your active customers here.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {queue.length === 0 ? (
                                    <p className="text-gray-500 text-center py-10">No customers in queue.</p>
                                ) : (
                                    queue.map((item) => (
                                        <div key={item._id} className={`flex items-start justify-between p-4 rounded-lg border border-zinc-800 ${item.status === 'completed' ? 'bg-zinc-900/50 opacity-50' : 'bg-zinc-950'}`}>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold font-mono text-blue-400">
                                                        #{item._id.slice(-4).toUpperCase()}
                                                    </span>
                                                    <h3 className="font-semibold text-lg">{item.customerId?.name || item.customerName}</h3>
                                                </div>
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    📞 {item.customerId?.phone || "No phone"}
                                                </p>
                                                <p className="text-sm text-gray-300">
                                                    {item.selectedServices.map((s: any) => s.name).join(", ")}
                                                </p>
                                                <span className={`text-xs uppercase px-2 py-0.5 rounded-full inline-block mt-2 ${item.status === 'waiting' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-green-900/30 text-green-500'}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            {item.status !== 'completed' && item.status !== 'cancelled' && (
                                                <div className="flex gap-2">
                                                    <Button size="icon" variant="ghost" onClick={() => updateStatus(item._id, "completed")} className="text-green-500 hover:text-green-400 hover:bg-green-900/20">
                                                        <CheckCircle className="w-5 h-5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => updateStatus(item._id, "cancelled")} className="text-red-500 hover:text-red-400 hover:bg-red-900/20">
                                                        <XCircle className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: Service Management & QR */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        
                        {/* Services */}
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-white">Services</CardTitle>
                                <CardDescription>Manage what you offer.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 mb-6">
                                    {services.map((service, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
                                            <div>
                                                <p className="font-medium text-white">{service.name}</p>
                                                <p className="text-xs text-gray-400">{service.durationMin} min • ${service.cost}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeService(idx)} className="text-red-400 hover:bg-zinc-900">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <Input 
                                        placeholder="Name" 
                                        className="bg-zinc-950 border-zinc-800 col-span-3 text-white" 
                                        value={newService.name}
                                        onChange={(e) => setNewService({...newService, name: e.target.value})}
                                    />
                                    <Input 
                                        type="number" 
                                        placeholder="Mins" 
                                        className="bg-zinc-950 border-zinc-800 text-white" 
                                        value={newService.durationMin}
                                        onChange={(e) => setNewService({...newService, durationMin: e.target.value})}
                                    />
                                    <Input 
                                        type="number" 
                                        placeholder="Cost" 
                                        className="bg-zinc-950 border-zinc-800 text-white" 
                                        value={newService.cost}
                                        onChange={(e) => setNewService({...newService, cost: e.target.value})}
                                    />
                                    <Button onClick={addService} className="bg-blue-600 hover:bg-blue-700 w-full" variant="secondary">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Store QR */}
                        <Card className="bg-gradient-to-br from-blue-900/20 to-zinc-900 border-blue-500/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <QrCode className="text-blue-400" /> Your Store QR
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <div className="bg-white p-4 inline-block rounded-lg mb-4">
                                    {businessProfile?.uniqueQrCode ? (
                                       <QRCode 
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/store/${businessProfile.uniqueQrCode}`}
                                            size={128}
                                        />
                                    ) : (
                                        <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-black font-bold">
                                            Loading...
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 mb-4">Scan to join queue</p>
                                <div className="text-xs text-gray-500 break-all mb-4">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/store/${businessProfile?.uniqueQrCode}` : ''}
                                </div>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                                    const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${businessProfile.uniqueQrCode}`;
                                    const printWindow = window.open('', '_blank');
                                    if(printWindow) {
                                        printWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>Scan to Join Queue - ${businessProfile.shopName}</title>
                                                    <style>
                                                        body { font-family: sans-serif; text-align: center; padding: 40px; }
                                                        .container { border: 2px solid #000; padding: 40px; border-radius: 20px; display: inline-block; }
                                                        h1 { font-size: 32px; margin-bottom: 10px; }
                                                        p { font-size: 18px; color: #555; }
                                                        .qr { margin: 20px 0; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="container">
                                                        <h1>QueueLess at ${businessProfile.shopName}</h1>
                                                        <p>Scan this code to join the queue instantly!</p>
                                                        <div class="qr">
                                                            ${document.querySelector('svg')?.outerHTML || 'QR Code Error'}
                                                        </div>
                                                        <p>No app download required.</p>
                                                    </div>
                                                    <script>
                                                        setTimeout(() => { window.print(); window.close(); }, 500);
                                                    </script>
                                                </body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                    }
                                }}>Download / Print</Button>
                            </CardContent>
                        </Card>

                    </motion.div>
                </div>
            </div>
        </div>
    );
}
