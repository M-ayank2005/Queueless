import React, { useMemo, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { FAQ_ITEMS, FAQ_CATEGORIES } from "../../data/faqData";
import { ThemeColors } from "../../theme/colors";
import { radii, spacing } from "../../theme/theme";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isMenu?: boolean;
}

interface MenuOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  prompt: string;
}

const MENU_OPTIONS: MenuOption[] = [
  {
    id: "wait_time",
    icon: "time-outline",
    title: "Check Live Queue & Wait Time",
    description: "Current position, people ahead, and estimated wait",
    prompt: "What is my current queue position and estimated wait time?",
  },
  {
    id: "scan_qr",
    icon: "qr-code-outline",
    title: "How to Join a Queue (Scan QR)",
    description: "Scan store QR code, select services, and join line",
    prompt: "How do I scan a store QR code and join a queue?",
  },
  {
    id: "edit_services",
    icon: "create-outline",
    title: "Edit Services on Active Ticket",
    description: "Safely update service counts without losing spot",
    prompt: "How can I edit services or quantities on my active ticket?",
  },
  {
    id: "counter_verify",
    icon: "shield-checkmark-outline",
    title: "Counter Verification (Ticket QR)",
    description: "How merchant verifies your ticket when it's your turn",
    prompt: "How does counter verification work when it is my turn?",
  },
  {
    id: "cancel_ticket",
    icon: "close-circle-outline",
    title: "Cancel Active Booking",
    description: "Leave the queue if you can no longer attend",
    prompt: "How do I cancel my active ticket?",
  },
  {
    id: "payments",
    icon: "card-outline",
    title: "In-Person Payments & Pricing",
    description: "All payments are completed in person with the merchant",
    prompt: "How do payments work in QueueLess? Are payments online or at the store?",
  },
  {
    id: "merchant_ops",
    icon: "storefront-outline",
    title: "Merchant Queue Management",
    description: "Call next customer, view customer details, and verify tickets",
    prompt: "As a merchant, how do I call the next customer and advance queue status?",
  },
  {
    id: "human_support",
    icon: "mail-outline",
    title: "Contact Human Support",
    description: "Reach our support desk for account issues",
    prompt: "How can I contact human customer support?",
  },
];

/**
 * FormattedMessageText
 * Parses raw text, list bullets, numbered steps, bold, and notes into clean native typography
 * removing ugly raw markdown asterisks (**) and hashtags (###).
 */
function FormattedMessageText({
  content,
  isUser,
  colors,
  styles,
}: {
  content: string;
  isUser: boolean;
  colors: ThemeColors;
  styles: any;
}) {
  if (isUser) {
    return <Text style={styles.messageTextUser}>{content}</Text>;
  }

  // Pre-clean raw headers like ### or ##
  const cleaned = content.replace(/^#{1,6}\s+/gm, "").trim();
  const lines = cleaned.split("\n");

  return (
    <View style={styles.formattedContainer}>
      {lines.map((line, lineIdx) => {
        let trimmed = line.trim();
        if (!trimmed) {
          return <View key={`sp-${lineIdx}`} style={styles.paragraphSpacer} />;
        }

        // Check if line is a note: e.g. "*(Note: ...)*" or "(Note: ...)"
        if (
          (trimmed.startsWith("*(") && trimmed.endsWith(")*")) ||
          trimmed.startsWith("*(Note") ||
          trimmed.startsWith("(Note")
        ) {
          const noteText = trimmed.replace(/^\*\(/, "(").replace(/\)\*$/, ")");
          return (
            <Text
              key={`note-${lineIdx}`}
              style={[styles.noteText, { color: colors.muted }]}
            >
              {renderInlineFormatted(noteText, colors, styles)}
            </Text>
          );
        }

        // Check if line is a numbered item: e.g. "1. **Title**: Description"
        const numMatch = trimmed.match(/^(\d+[\.\)])\s*(.*)/);
        if (numMatch) {
          const numberPrefix = numMatch[1];
          const restOfLine = numMatch[2];
          return (
            <View key={`num-${lineIdx}`} style={styles.listItemRow}>
              <Text style={[styles.listNumber, { color: colors.primary }]}>
                {numberPrefix}
              </Text>
              <Text style={[styles.listItemText, { color: colors.text }]}>
                {renderInlineFormatted(restOfLine, colors, styles)}
              </Text>
            </View>
          );
        }

        // Check if line is a bullet item: e.g. "* Item" or "- Item" or "• Item"
        const bulletMatch = trimmed.match(/^([\-•]|\*(?!\*))\s*(.*)/);
        if (bulletMatch) {
          const restOfLine = bulletMatch[2];
          return (
            <View key={`bullet-${lineIdx}`} style={styles.listItemRow}>
              <Text style={[styles.listBullet, { color: colors.primary }]}>
                •
              </Text>
              <Text style={[styles.listItemText, { color: colors.text }]}>
                {renderInlineFormatted(restOfLine, colors, styles)}
              </Text>
            </View>
          );
        }

        // Standard paragraph line
        return (
          <Text
            key={`p-${lineIdx}`}
            style={[styles.paragraphText, { color: colors.text }]}
          >
            {renderInlineFormatted(trimmed, colors, styles)}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * renderInlineFormatted
 * Extracts **bold** and *italic* tokens and renders them natively without showing asterisks
 */
function renderInlineFormatted(
  rawText: string,
  colors: ThemeColors,
  styles: any
) {
  const parts = rawText.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <Text key={`b-${idx}`} style={[styles.boldText, { color: colors.text }]}>
          {boldText}
        </Text>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const italicText = part.slice(1, -1);
      return (
        <Text
          key={`i-${idx}`}
          style={[styles.italicText, { color: colors.muted }]}
        >
          {italicText}
        </Text>
      );
    }

    // Clean any residual stray asterisks
    const plain = part.replace(/\*/g, "");
    return (
      <Text key={`t-${idx}`} style={{ color: colors.text }}>
        {plain}
      </Text>
    );
  });
}

export default function HelpSupportScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<"faq" | "ai">("ai");

  // FAQ State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am your QueueLess Support Assistant. I can help you check your active ticket status, explain counter verification, or guide you through queue settings. Type 'menu' anytime to view common topics.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      q === "" ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const openSupportEmail = () => {
    Linking.openURL("mailto:support@queueless.local?subject=QueueLess%20Support%20Request");
  };

  // Triggers the interactive problem selection menu
  const triggerMenu = () => {
    const menuMsg: ChatMessage = {
      id: `menu-${Date.now()}`,
      role: "assistant",
      content:
        "Select a problem from the menu below to get immediate guidance, or explain your situation in the text box:",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMenu: true,
    };
    setMessages((prev) => [...prev, menuMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const handleSendMessage = async (retryContent?: string) => {
    const textToSend = (retryContent || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const lower = textToSend.toLowerCase();
    const isMenuKeyword =
      lower === "menu" ||
      lower === "/menu" ||
      lower === "help menu" ||
      lower === "options" ||
      lower === "help";

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!retryContent) setInputMessage("");
    setChatError(null);
    setLastFailedMessage(null);

    // If user asked for menu, present the problem selection menu immediately
    if (isMenuKeyword) {
      setTimeout(() => {
        const menuMsg: ChatMessage = {
          id: `asst-menu-${Date.now()}`,
          role: "assistant",
          content:
            "Select a problem from the menu below to get immediate guidance, or explain your situation in the text box:",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMenu: true,
        };
        setMessages((prev) => [...prev, menuMsg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
      }, 200);
      return;
    }

    setIsLoading(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const historyPayload = messages
        .filter((m) => !m.isMenu && m.id !== "welcome-1")
        .slice(-6)
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          content: m.content,
        }));

      const res = await api.post("/support/chat", {
        message: textToSend,
        history: historyPayload,
      });

      const replyContent =
        res.data?.reply ||
        "I received your message but could not generate a response. Please try again.";

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Unable to connect to AI Support. Please check your internet connection or email our support desk.";
      setChatError(msg);
      setLastFailedMessage(textToSend);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  return (
    <AppScreen
      scroll={activeTab === "faq"}
      safeBottom={activeTab === "faq"}
      contentContainerStyle={
        activeTab === "ai" ? styles.screenContentAi : styles.screenContent
      }
    >
      {/* Top Header - Back Button Only (No Gemini Badge) */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
        >
          <View style={styles.backIconCircle}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </View>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Title */}
      <View style={[styles.titleSection, activeTab === "ai" && styles.titleSectionAi]}>
        <Text style={[styles.pageTitle, activeTab === "ai" && styles.pageTitleAi]}>
          Help & Support
        </Text>
        {activeTab === "faq" && (
          <Text style={styles.pageSubtitle}>
            Frequently asked questions, live ticket guidance, and direct support.
          </Text>
        )}
      </View>

      {/* Segment Switcher */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "ai" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("ai")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={activeTab === "ai" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "ai" && styles.segmentBtnTextActive,
            ]}
          >
            AI Assistant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "faq" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("faq")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="help-circle"
            size={16}
            color={activeTab === "faq" ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "faq" && styles.segmentBtnTextActive,
            ]}
          >
            FAQs & Guides
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: AI ASSISTANT CHAT (Occupies Full Remaining Screen) */}
      {activeTab === "ai" && (
        <Card style={styles.chatCard}>
          {/* Clean Status Header (No Personalized Text, No Gemini Badge) */}
          <View style={styles.chatStatusBar}>
            <View style={styles.chatStatusLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.chatStatusTitle}>QueueLess Assistant</Text>
              <View style={styles.onlinePill}>
                <Text style={styles.onlinePillText}>Online</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.menuHeaderBtn}
              onPress={triggerMenu}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Show Problem Menu"
            >
              <Ionicons name="list" size={13} color={colors.primary} />
              <Text style={styles.menuHeaderBtnText}>Problem Menu</Text>
            </TouchableOpacity>
          </View>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.assistantAvatar}>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant,
                      msg.isMenu && styles.messageBubbleMenu,
                    ]}
                  >
                    <FormattedMessageText
                      content={msg.content}
                      isUser={isUser}
                      colors={colors}
                      styles={styles}
                    />

                    {/* Interactive Problem Selection Menu Options */}
                    {msg.isMenu && (
                      <View style={styles.menuCardsContainer}>
                        {MENU_OPTIONS.map((opt) => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.menuCard,
                              { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                            onPress={() => handleSendMessage(opt.prompt)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.menuCardIcon,
                                { backgroundColor: colors.primarySubtle },
                              ]}
                            >
                              <Ionicons name={opt.icon} size={16} color={colors.primary} />
                            </View>
                            <View style={styles.menuCardTextCol}>
                              <Text style={[styles.menuCardTitle, { color: colors.text }]}>
                                {opt.title}
                              </Text>
                              <Text
                                style={[styles.menuCardDesc, { color: colors.muted }]}
                                numberOfLines={2}
                              >
                                {opt.description}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageTimestamp,
                        isUser
                          ? styles.messageTimestampUser
                          : styles.messageTimestampAssistant,
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {isLoading && (
              <View style={styles.messageRowAssistant}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <View style={[styles.messageBubbleAssistant, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>QueueLess Assistant is typing...</Text>
                </View>
              </View>
            )}

            {chatError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <View style={styles.errorTextCol}>
                  <Text style={styles.errorTitle}>Request failed</Text>
                  <Text style={styles.errorSub}>{chatError}</Text>
                </View>
                {lastFailedMessage && (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => handleSendMessage(lastFailedMessage)}
                  >
                    <Ionicons name="refresh" size={12} color={colors.danger} />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Quick Problem Action Chips Row */}
          <View style={styles.quickChipsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsContent}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.quickChipMenu}
                onPress={triggerMenu}
                activeOpacity={0.7}
              >
                <Ionicons name="grid-outline" size={12} color="#FFFFFF" />
                <Text style={styles.quickChipMenuText}>Problem Menu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickChip}
                onPress={() =>
                  handleSendMessage("What is my current queue position and estimated wait time?")
                }
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText}>🎫 My Wait Time</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickChip}
                onPress={() =>
                  handleSendMessage("How do I scan a store QR code and join a queue?")
                }
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText}>📱 Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickChip}
                onPress={() =>
                  handleSendMessage("How can I edit services or quantities on my active ticket?")
                }
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText}>✏️ Edit Services</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickChip}
                onPress={() =>
                  handleSendMessage("How does counter verification with QR work?")
                }
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText}>🔍 Counter QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickChip}
                onPress={() =>
                  handleSendMessage("How do payments work in QueueLess?")
                }
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText}>💳 Payments</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Input Bar — User can explain completely in textbox if they want */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Ask a question or explain your problem..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputMessage.trim() || isLoading) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Send Message"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={inputMessage.trim() ? "#FFFFFF" : colors.muted}
                />
              )}
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* TAB 2: FAQS & GUIDES */}
      {activeTab === "faq" && (
        <View style={styles.faqSection}>
          {/* Search Box */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search FAQs by keyword..."
              placeholderTextColor={colors.muted}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category Chips Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {FAQ_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chipBtn,
                  selectedCategory === cat.id && styles.chipBtnActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategory === cat.id && styles.chipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ Accordion List */}
          <View style={styles.faqList}>
            {filteredFaqs.map((faq) => {
              const isOpen = expandedFaqId === faq.id;
              return (
                <Card key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    onPress={() => toggleFaq(faq.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isOpen ? colors.primary : colors.muted}
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>

          {/* Contact Support Card - Solid Opaque Styling without muddy elevation bleed */}
          <Card variant="subtle" style={styles.supportContactCard}>
            <View style={styles.supportCardLeft}>
              <View style={styles.supportIconWrap}>
                <Ionicons name="mail" size={20} color={colors.primary} />
              </View>
              <View style={styles.supportTextCol}>
                <Text style={styles.supportCardTitle}>Need Human Support?</Text>
                <Text style={styles.supportCardSub}>
                  Reach our team at support@queueless.local
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.emailDeskBtn}
              onPress={openSupportEmail}
              activeOpacity={0.8}
            >
              <Text style={styles.emailDeskBtnText}>Email Desk</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}
    </AppScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screenContent: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    screenContentAi: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.xs,
      gap: spacing.xs,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: Platform.OS === "android" ? spacing.md : spacing.xs,
      paddingBottom: spacing.xs,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radii.full,
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    backIconCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    backText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    titleSection: {
      gap: 4,
    },
    titleSectionAi: {
      gap: 2,
      paddingBottom: 0,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    pageTitleAi: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    pageSubtitle: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
    segmentContainer: {
      flexDirection: "row",
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: 3,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: radii.md,
    },
    segmentBtnActive: {
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
    },
    segmentBtnTextActive: {
      color: colors.text,
      fontWeight: "700",
    },
    chatCard: {
      flex: 1,
      minHeight: 0,
      padding: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      marginBottom: 0,
    },
    chatStatusBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardSoft,
    },
    chatStatusLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    chatStatusTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    onlinePill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
      backgroundColor: colors.successSubtle,
    },
    onlinePillText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.success,
    },
    menuHeaderBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radii.full,
      backgroundColor: colors.primarySubtle,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    menuHeaderBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
    },
    messagesScroll: {
      flex: 1,
      padding: spacing.md,
    },
    messagesContent: {
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    messageRow: {
      flexDirection: "row",
      gap: spacing.xs,
      marginVertical: 2,
    },
    messageRowUser: {
      justifyContent: "flex-end",
    },
    messageRowAssistant: {
      justifyContent: "flex-start",
    },
    assistantAvatar: {
      width: 26,
      height: 26,
      borderRadius: radii.sm,
      backgroundColor: colors.primarySubtle,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    messageBubble: {
      maxWidth: "84%",
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: radii.lg,
    },
    messageBubbleUser: {
      backgroundColor: colors.primary,
      borderTopRightRadius: 4,
    },
    messageBubbleAssistant: {
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      borderTopLeftRadius: 4,
    },
    messageBubbleMenu: {
      maxWidth: "94%",
    },
    messageTextUser: {
      color: "#FFFFFF",
      fontWeight: "500",
      fontSize: 13,
      lineHeight: 18,
    },
    messageTimestamp: {
      fontSize: 9,
      marginTop: 5,
      textAlign: "right",
    },
    messageTimestampUser: {
      color: "rgba(255,255,255,0.75)",
    },
    messageTimestampAssistant: {
      color: colors.muted,
    },
    formattedContainer: {
      gap: 3,
    },
    paragraphSpacer: {
      height: 5,
    },
    paragraphText: {
      fontSize: 13,
      lineHeight: 19,
    },
    listItemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 5,
      marginVertical: 1.5,
    },
    listNumber: {
      fontSize: 13,
      fontWeight: "700",
      minWidth: 16,
    },
    listBullet: {
      fontSize: 14,
      fontWeight: "700",
      minWidth: 12,
    },
    listItemText: {
      fontSize: 13,
      lineHeight: 19,
      flex: 1,
    },
    noteText: {
      fontStyle: "italic",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    boldText: {
      fontWeight: "700",
    },
    italicText: {
      fontStyle: "italic",
    },
    menuCardsContainer: {
      gap: 6,
      marginTop: 8,
      marginBottom: 3,
    },
    menuCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 9,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    menuCardIcon: {
      width: 30,
      height: 30,
      borderRadius: radii.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    menuCardTextCol: {
      flex: 1,
      gap: 1,
    },
    menuCardTitle: {
      fontSize: 12,
      fontWeight: "700",
    },
    menuCardDesc: {
      fontSize: 10,
      lineHeight: 14,
    },
    loadingBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 10,
    },
    loadingText: {
      fontSize: 12,
      color: colors.muted,
      fontStyle: "italic",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.dangerSubtle,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    errorTextCol: {
      flex: 1,
    },
    errorTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.danger,
    },
    errorSub: {
      fontSize: 11,
      color: colors.danger,
    },
    retryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
    },
    retryBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.danger,
    },
    quickChipsBar: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardSoft,
      paddingVertical: 6,
    },
    quickChipsContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm,
    },
    quickChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickChipText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    quickChipMenu: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
    },
    quickChipMenuText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardSoft,
      gap: spacing.xs,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
      maxHeight: 70,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: {
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
    },
    faqSection: {
      gap: spacing.md,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      height: 44,
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
    },
    chipsScroll: {
      gap: 6,
      paddingVertical: 2,
    },
    chipBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.full,
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
    },
    chipBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
    },
    chipTextActive: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    faqList: {
      gap: spacing.sm,
    },
    faqCard: {
      padding: 0,
      overflow: "hidden",
    },
    faqQuestionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
    },
    faqQuestionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      paddingRight: spacing.sm,
    },
    faqAnswerWrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.xs,
    },
    faqAnswerText: {
      fontSize: 13,
      color: colors.mutedDark,
      lineHeight: 19,
    },
    supportContactCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      elevation: 0,
      shadowOpacity: 0,
      gap: spacing.sm,
    },
    supportCardLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
    },
    supportIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    supportTextCol: {
      flex: 1,
    },
    supportCardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    supportCardSub: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 1,
    },
    emailDeskBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },
    emailDeskBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
