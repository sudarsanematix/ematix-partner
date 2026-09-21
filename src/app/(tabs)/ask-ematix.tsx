import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../../components/MaterialIcon';

const DRIVER_PROMPTS = [
  { id: '1', label: 'Busy zones near me', icon: 'local-fire-department' },
  { id: '2', label: 'Summarize tips', icon: 'payments' },
  { id: '3', label: 'Update RC Book', icon: 'description' },
  { id: '4', label: 'Peak hours today', icon: 'trending-up' },
];

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const INITIAL_GREETING =
  "Hi Rajesh! I'm your Driver AI Assistant. Ask me about hotspots, earnings, or how to update your vehicle documents.";

const RESPONSES: Record<string, string> = {
  'busy zones near me': "T. Nagar and Phoenix Marketcity are surging right now. If you head towards T. Nagar, you're likely to get a ride within 2 minutes.",
  'summarize tips': "You've earned ₹450 in tips so far this week! Your highest tipped ride was yesterday at 8:30 PM (₹150).",
  'update rc book': "To update your RC Book, go to Profile > Vehicle Details > Documents. You can upload a clear photo of your new RC there.",
  'peak hours today': "Today's peak hours in your area are projected to be 5:30 PM to 8:00 PM. Expect higher fares and more ride requests during this window.",
  'default': "I'm still learning! But I can help you find hotspots, check your earnings, or manage your profile.",
};

let msgId = 0;
const nextId = () => `m${++msgId}`;

export default function AskEmatixScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'greet', role: 'assistant', text: INITIAL_GREETING },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = (text: string = inputText) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add user message
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: trimmed }]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const lower = trimmed.toLowerCase();
      const replyText = RESPONSES[lower] || RESPONSES['default'];
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: replyText }]);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="ask-ematix" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <MaterialIcon name="auto-awesome" size={22} color={colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Partner AI Concierge</Text>
              <Text style={styles.heroSubtitle}>Your smart assistant for earnings, hotspots, and support.</Text>
            </View>
          </View>

          {/* Messages */}
          {messages.map((msg) => (
            <View key={msg.id} style={styles.row}>
              {msg.role === 'assistant' && (
                <View style={styles.assistantAvatar}>
                  <MaterialIcon name="auto-awesome" size={14} color={colors.onPrimary} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
                ]}
              >
                <Text style={[styles.messageText, msg.role === 'user' && styles.userMessageText]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}

          {/* Suggestions */}
          <View style={styles.promptWrap}>
            <Text style={styles.promptLabel}>Suggestions</Text>
            <View style={styles.promptChips}>
              {DRIVER_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.promptChip}
                  activeOpacity={0.8}
                  onPress={() => handleSend(p.label)}
                >
                  <MaterialIcon name={p.icon as MaterialIconName} size={16} color={colors.primary} />
                  <Text style={styles.promptChipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.composerBar}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask Ematix a question..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              activeOpacity={0.85}
              disabled={!inputText.trim()}
              onPress={() => handleSend()}
            >
              <MaterialIcon name="arrow-upward" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  chatContent: {
    padding: spacing.marginMobile,
    paddingTop: spacing.stackLg,
    paddingBottom: spacing.stackXl,
    gap: spacing.stackMd,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.lightBlueTint,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.stackSm,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.onPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroTitle: { ...type.labelLg, color: colors.onSurface },
  heroSubtitle: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  row: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bubble: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderTopRightRadius: radius.sm,
  },
  messageText: {
    ...type.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.onPrimary,
  },
  promptWrap: { marginTop: spacing.stackMd, flexDirection: 'column', gap: spacing.stackSm },
  promptLabel: { ...type.labelSm, color: colors.textMuted },
  promptChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
  },
  promptChipText: { ...type.labelMd, color: colors.primary },
  composerBar: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
    paddingBottom: 88,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    paddingLeft: spacing.stackMd,
    paddingVertical: 8,
  },
  input: { flex: 1, ...type.bodyMd, color: colors.onSurface, padding: 0 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
