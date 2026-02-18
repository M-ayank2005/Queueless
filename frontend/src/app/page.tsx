"use client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, Clock, ShieldCheck, Zap, Users, BarChart3, Smartphone, Check, Instagram, Twitter, Linkedin, Github } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [myQueues, setMyQueues] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("active"); 
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.role === 'business') {
        router.push("/dashboard");
      } else {
        fetchMyQueues();
        fetchHistory();
      }
    }
  }, []);

  const fetchMyQueues = async () => {
      try {
          const res = await api.get("/queue/my-queues");
          setMyQueues(res.data);
      } catch (error) {
          console.error("Failed to fetch queues", error);
      }
  };

  const fetchHistory = async () => {
      try {
          const res = await api.get("/queue/history");
          setHistory(res.data);
      } catch (error) {
          console.error("Failed to fetch history", error);
      }
  };

  // Customer Dashboard View (unchanged logic, just ensuring it renders if logged in)
  if (user && user.role === 'customer') {
     // ... (Keep existing customer dashboard logic or extract to component? For now, I will inline the existing optimized customer view to keep this file self-contained but clean)
     return (
       <div className="min-h-screen bg-black text-white p-6 pt-24">
         <Navbar />
         <div className="container mx-auto max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Hello, {user.name} 👋</h1>
                <Link href="/scan">
                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <QrCode className="w-4 h-4" /> Scan to Join
                    </Button>
                </Link>
            </div>

            <div className="flex gap-4 mb-6 border-b border-zinc-800 pb-2">
                <button 
                    onClick={() => setActiveTab("active")}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "active" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:text-white"}`}
                >
                    Active Queues ({myQueues.length})
                </button>
                <button 
                    onClick={() => setActiveTab("history")}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "history" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:text-white"}`}
                >
                    History
                </button>
            </div>

            {activeTab === "active" ? (
                <div className="grid gap-4">
                    {myQueues.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
                            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Queues</h3>
                            <p className="text-gray-500 mb-6">You are not currently in any queues.</p>
                            <Link href="/scan"><Button variant="outline" className="border-zinc-700 text-blue-400">Join a Queue</Button></Link>
                        </div>
                    ) : (
                        myQueues.map((q) => (
                            <Link href={`/status/${q._id}`} key={q._id}>
                                <motion.div 
                                    whileHover={{ scale: 1.01 }}
                                    className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex justify-between items-center cursor-pointer hover:border-blue-500/50 transition-colors"
                                >
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{q.businessId?.shopName || "Unknown Shop"}</h3>
                                        <p className="text-sm text-gray-400 mb-3">{q.businessId?.address}</p>
                                        <div className="flex gap-3">
                                            <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded border border-blue-900/50">
                                                Ticket: #{q._id.slice(-4).toUpperCase()}
                                            </span>
                                            <span className="bg-yellow-900/30 text-yellow-500 text-xs px-2 py-1 rounded border border-yellow-900/50">
                                                {q.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white mb-1">{q.peopleAhead} <span className="text-sm font-normal text-gray-500">ahead</span></div>
                                        <div className="text-sm text-gray-400">~{q.currentEstimatedWait} mins wait</div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                     {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-10">No past activity.</p>
                    ) : (
                        history.map((h) => (
                            <div key={h._id} className="bg-zinc-950 border border-zinc-900 p-4 rounded-lg flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                                <div>
                                    <h4 className="font-semibold text-gray-300">{h.businessId?.businessProfile?.shopName || h.businessId?.shopName || "Store"}</h4>
                                    <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString()} • {h.selectedServices?.map((s:any) => s.name).join(", ")}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${h.status === 'completed' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                                    {h.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
         </div>
       </div>
    );
  }

  // Guest View (Enhanced Landing Page)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 blur-[130px] rounded-full pointer-events-none opacity-50" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none opacity-30" />
        
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Now Live: QueueLess V1.0
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
              Eliminate Lines.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Forever.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              The smartest way to manage customer flow. Businesses save time, customers skip the wait. No app download required.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register?role=business">
                <Button size="lg" className="h-14 px-10 text-lg bg-blue-600 hover:bg-blue-700 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-105">
                  Get Started for Business
                </Button>
              </Link>
              <Link href="/register?role=customer">
                <Button variant="outline" size="lg" className="h-14 px-10 text-lg border-white/10 hover:bg-white/5 text-white rounded-full bg-zinc-900/50 backdrop-blur-sm">
                  Join a Queue
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-16 flex items-center justify-center gap-8 text-gray-500 grayscale opacity-70">
                 {/* Mock Logos */}
                 <div className="font-bold text-xl">ACME Corp</div>
                 <div className="font-bold text-xl">BarberX</div>
                 <div className="font-bold text-xl">Salonify</div>
                 <div className="font-bold text-xl">MediWait</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-24 px-6 bg-zinc-950 border-t border-white/5">
         <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
                <p className="text-gray-400 text-lg">Three simple steps to seamless queue management.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent dashed" />
                
                <div className="text-center relative z-10">
                    <div className="w-24 h-24 mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <QrCode className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">1. Scan</h3>
                    <p className="text-gray-400">Customers scan a unique QR code displayed at your storefront. No app installation needed.</p>
                </div>
                <div className="text-center relative z-10">
                    <div className="w-24 h-24 mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <Smartphone className="w-10 h-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">2. Join</h3>
                    <p className="text-gray-400">They select services, see estimated wait times, and join the digital queue instantly.</p>
                </div>
                <div className="text-center relative z-10">
                    <div className="w-24 h-24 mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <Zap className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">3. Relax</h3>
                    <p className="text-gray-400">Customers wait anywhere. We notify them when it's their turn. Zero frustration.</p>
                </div>
            </div>
         </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative">
        <div className="container mx-auto max-w-6xl">
           <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-16">
               <div className="max-w-2xl">
                   <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need to <br className="hidden md:block"/>run a smooth operation.</h2>
                   <p className="text-gray-400 text-lg">Built for barbershops, clinics, banks, and events. Scalable, fast, and reliable.</p>
               </div>
               <Link href="/register?role=business">
                    <Button variant="secondary" className="mt-4">See All Features</Button>
               </Link>
           </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Clock className="w-6 h-6 text-blue-400" />}
              title="Real-time Estimates"
              desc="Advanced algorithms calculate wait times dynamically based on service duration."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
              title="Business Control"
              desc="Manage your schedule with Working Hours, Closed Days, and Service customization."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-indigo-400" />}
              title="Queue History"
              desc="Track customer flow and access historical data for better business insights."
            />
             <FeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-pink-400" />}
              title="Live Dashboard"
              desc="A powerful command center to manage active queues and staff/services."
            />
             <FeatureCard 
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="Instant Notifications"
              desc="Browser notifications ensure customers never miss their turn."
            />
             <FeatureCard 
              icon={<QrCode className="w-6 h-6 text-purple-400" />}
              title="Printable Kits"
              desc="Generate and print branded QR signage directly from your dashboard."
            />
          </div>
        </div>
      </section>

      {/* Testimonial / CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-blue-900/10 to-transparent border-t border-b border-white/5">
          <div className="container mx-auto max-w-4xl text-center">
             <div className="text-blue-500 mb-6 text-6xl opacity-50 font-serif">"</div>
             <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                 Since implementing QueueLess, our lobby is calm, customers are happier, and we process 20% more appointments per day.
             </h2>
             <div className="flex items-center justify-center gap-4">
                 <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                 <div className="text-left">
                     <p className="font-bold text-white">Alex Rodriguez</p>
                     <p className="text-sm text-gray-500">Owner, The Modern Barber</p>
                 </div>
             </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-zinc-950 border-t border-white/5 text-sm">
        <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-2 md:col-span-1">
                    <h3 className="text-xl font-bold text-white mb-4">QueueLess.</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">
                        Making waiting a thing of the past. Join thousands of businesses modernizing their customer flow.
                    </p>
                    <div className="flex gap-4">
                        <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                        <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                        <Linkedin className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                        <Github className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                    </div>
                </div>
                
                <div>
                    <h4 className="font-semibold text-white mb-6">Product</h4>
                    <ul className="space-y-4 text-gray-500">
                        <li className="hover:text-blue-400 cursor-pointer">Features</li>
                        <li className="hover:text-blue-400 cursor-pointer">Pricing</li>
                        <li className="hover:text-blue-400 cursor-pointer">For Enterprise</li>
                        <li className="hover:text-blue-400 cursor-pointer">Case Studies</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-6">Resources</h4>
                    <ul className="space-y-4 text-gray-500">
                        <li className="hover:text-blue-400 cursor-pointer">Documentation</li>
                        <li className="hover:text-blue-400 cursor-pointer">API Reference</li>
                        <li className="hover:text-blue-400 cursor-pointer">Community</li>
                        <li className="hover:text-blue-400 cursor-pointer">Help Center</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-white mb-6">Company</h4>
                    <ul className="space-y-4 text-gray-500">
                        <li className="hover:text-blue-400 cursor-pointer">About</li>
                        <li className="hover:text-blue-400 cursor-pointer">Careers</li>
                        <li className="hover:text-blue-400 cursor-pointer">Blog</li>
                        <li className="hover:text-blue-400 cursor-pointer">Legal</li>
                    </ul>
                </div>
            </div>
            
            <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-600">
                <p>© 2026 QueueLess Inc. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <span className="hover:text-gray-400 cursor-pointer">Privacy Policy</span>
                    <span className="hover:text-gray-400 cursor-pointer">Terms of Service</span>
                    <span className="hover:text-gray-400 cursor-pointer">Cookies</span>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
    >
      <div className="mb-4 p-3 bg-white/5 rounded-lg inline-block group-hover:bg-blue-500/10 transition-colors">{icon}</div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
