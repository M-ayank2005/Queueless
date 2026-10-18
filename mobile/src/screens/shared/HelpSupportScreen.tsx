import React, { useMemo, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
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
}

export default function HelpSupportScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
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
      content: "Hello! I am your QueueLess AI Support Assistant. I can help you check your active ticket status, explain counter verification, or guide you through queue settings. How can I assist you?",
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

  const handleSendMessage = async (retryContent?: string) => {
    const textToSend = (retryContent || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!retryContent) setInputMessage("");
    setIsLoading(true);
    setChatError(null);
    setLastFailedMessage(null);

    // Scroll chat down
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
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
    <AppScreen contentContainerStyle={styles.screenContent}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <View style={styles.backIconCircle}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </View>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.geminiBadge}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.geminiBadgeText}>Gemini 3.8 Flash</Text>
        </View>
      </View>

      {/* Screen Title */}
      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>Help & Support</Text>
        <Text style={styles.pageSubtitle}>
          Frequently asked questions, live ticket guidance, and direct support.
        </Text>
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

      {/* TAB 1: AI ASSISTANT CHAT */}
      {activeTab === "ai" && (
        <Card style={styles.chatCard}>
          {/* Status Bar */}
          <View style={styles.chatStatusBar}>
            <View style={styles.chatStatusLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.chatStatusTitle}>
                {user ? `Personalized for ${user.name}` : "QueueLess Support Assistant"}
              </Text>
            </View>
            {user && (
              <View style={styles.syncBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                <Text style={styles.syncBadgeText}>Synced</Text>
              </View>
            )}
          </View>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
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
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.messageTextUser : styles.messageTextAssistant,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTimestamp,
                        isUser ? styles.messageTimestampUser : styles.messageTimestampAssistant,
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
                  <Text style={styles.loadingText}>QueueLess Assistant is thinking...</Text>
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

          {/* Input Bar */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={20}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Ask a question (e.g. check my wait time)..."
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
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={inputMessage.trim() ? "#FFFFFF" : colors.muted}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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

          {/* Contact Support Card */}
          <Card style={styles.supportContactCard}>
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
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: spacing.xs,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    backIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    backText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    geminiBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.full,
      backgroundColor: colors.primarySubtle,
    },
    geminiBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
    },
    titleSection: {
      gap: 4,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
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
      height: 520,
      padding: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    chatStatusBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
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
    syncBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.successSubtle,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    syncBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.success,
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
      maxWidth: "82%",
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
    messageText: {
      fontSize: 13,
      lineHeight: 18,
    },
    messageTextUser: {
      color: "#FFFFFF",
      fontWeight: "500",
    },
    messageTextAssistant: {
      color: colors.text,
    },
    messageTimestamp: {
      fontSize: 9,
      marginTop: 4,
      textAlign: "right",
    },
    messageTimestampUser: {
      color: "rgba(255,255,255,0.75)",
    },
    messageTimestampAssistant: {
      color: colors.muted,
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
      backgroundColor: colors.primarySubtle,
      borderColor: colors.primaryBorder,
      borderWidth: 1,
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
