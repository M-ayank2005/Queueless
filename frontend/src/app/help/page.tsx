"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { FAQ_ITEMS, FAQ_CATEGORIES, FaqItem } from "@/lib/faqData";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Bot, 
  Send, 
  RefreshCw, 
  Mail, 
  ShieldAlert, 
  Sparkles, 
  User, 
  Ticket, 
  CheckCircle2, 
  AlertCircle,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function HelpCenterPage() {
  const { user, status } = useAuth();

  // FAQ State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "Hello! I am your QueueLess AI Support Assistant. I can help you check your active ticket status, explain how counter verification works, or answer questions about joining and managing queues. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Filter FAQs
  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      q === "" || 
      item.question.toLowerCase().includes(q) || 
      item.answer.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  // Send message to backend Gemini AI support endpoint
  const handleSendMessage = async (retryContent?: string) => {
    const textToSend = (retryContent || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!retryContent) setInputMessage("");
    setIsLoading(true);
    setChatError(null);
    setLastFailedMessage(null);

    try {
      // Build short-lived bounded history for Gemini
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content
      }));

      const res = await api.post("/support/chat", {
        message: textToSend,
        history: historyPayload
      });

      const replyContent = res.data?.reply || "I received your message but could not generate a reply. Please try again.";

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        "Unable to reach AI support. Please check your connection or contact our support team.";
      setChatError(errorMsg);
      setLastFailedMessage(textToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <HelpCircle className="w-4 h-4" />
            QueueLess Help & Support Center
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            How can we help you today?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Search our frequently asked questions, ask our Gemini AI assistant about your active ticket, or contact human support.
          </p>
        </div>

        {/* Dual Layout: FAQ & AI Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: FAQ SECTION (7 Cols) */}
          <section className="lg:col-span-7 space-y-6" aria-label="Frequently Asked Questions">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Search Knowledge Base</CardTitle>
                <CardDescription>
                  Find instant answers about queue joining, ticket verification, and store features
                </CardDescription>

                {/* Search Input */}
                <div className="relative mt-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by keyword (e.g. verification, edit, wait time)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-background"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {FAQ_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-2">
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-sm font-semibold text-foreground">No questions found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search terms or ask our AI assistant on the right.
                    </p>
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isOpen = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="border border-border/70 rounded-xl overflow-hidden bg-background/50 transition-colors"
                      >
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm sm:text-base hover:bg-muted/30 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <span className="pr-4">{faq.question}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                              isOpen ? "rotate-180 text-primary" : ""
                            }`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground border-t border-border/40 leading-relaxed">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Human Support Escalation Card */}
            <Card className="border-border/60 bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Need to speak with our team?</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      For manual account verification or store billing issues, reach our desk at:
                    </p>
                    <a
                      href="mailto:support@queueless.local"
                      className="text-xs font-semibold text-primary hover:underline inline-block mt-1"
                    >
                      support@queueless.local
                    </a>
                  </div>
                </div>

                <a
                  href="mailto:support@queueless.local?subject=QueueLess%20Support%20Inquiry"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
                >
                  Send Email
                </a>
              </CardContent>
            </Card>
          </section>

          {/* RIGHT COLUMN: AI SUPPORT ASSISTANT (5 Cols) */}
          <section className="lg:col-span-5 space-y-4" aria-label="AI Support Chat">
            <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-sm flex flex-col h-[650px] overflow-hidden">
              
              {/* Chat Header */}
              <CardHeader className="py-3.5 px-4 border-b border-border bg-card/90 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                    <Bot className="w-4 h-4" />
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      QueueLess Assistant
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Gemini 3.8 Flash
                      </span>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {user ? `Personalized for ${user.name}` : "Online • Queue & Ticket Support"}
                    </p>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Synced
                  </div>
                )}
              </CardHeader>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {!user && (
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/80 text-xs text-muted-foreground flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-primary shrink-0" />
                      <span>Log in to allow the assistant to check your live queue spot.</span>
                    </div>
                    <Link
                      href="/login?redirect=/help"
                      className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-[11px] shrink-0"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted/70 text-foreground border border-border/60 rounded-tl-xs"
                        }`}
                      >
                        {msg.content}
                        <div
                          className={`text-[9px] mt-1 text-right ${
                            isUser ? "text-primary-foreground/75" : "text-muted-foreground"
                          }`}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-2.5 justify-start items-center">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-muted/60 border border-border/60 rounded-2xl rounded-tl-xs px-3.5 py-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:200ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:400ms]" />
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Request failed</p>
                        <p className="text-[11px] opacity-90">{chatError}</p>
                      </div>
                    </div>
                    {lastFailedMessage && (
                      <button
                        onClick={() => handleSendMessage(lastFailedMessage)}
                        className="px-2 py-1 rounded bg-destructive/20 hover:bg-destructive/30 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Footer */}
              <div className="p-3 border-t border-border bg-card/90 shrink-0">
                {!user ? (
                  <div className="text-center py-1">
                    <Link
                      href="/login?redirect=/help"
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Sign in to chat with QueueLess AI Support
                    </Link>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your question (e.g. check my wait time)..."
                      disabled={isLoading}
                      rows={2}
                      maxLength={1000}
                      className="flex-1 min-h-[44px] max-h-24 p-2.5 rounded-xl border border-input bg-background text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || !inputMessage.trim()}
                      size="sm"
                      className="h-11 px-3.5 rounded-xl shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}

                <p className="text-[10px] text-muted-foreground/80 text-center mt-2">
                  Responses are generated by AI using verified QueueLess data. We never sell your data or share passwords.
                </p>
              </div>
            </Card>
          </section>

        </div>
      </main>
    </div>
  );
}
