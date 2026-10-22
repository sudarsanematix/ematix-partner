import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../../components/MaterialIcon';
import TypingIndicator from '../../components/TypingIndicator';
import RichMessage, { Block } from '../../components/RichMessage';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { getAppLanguage } from '../../i18n';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  blocks?: Block[];
};

let msgId = 0;
const nextId = () => `m${++msgId}`;

export default function AskEmatixScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const driverPrompts = [
    { id: '1', label: t('ai.promptBusyZones'), icon: 'local-fire-department' },
    { id: '2', label: t('ai.promptSummarizeTips'), icon: 'payments' },
    { id: '3', label: t('ai.promptUpdateRc'), icon: 'description' },
    { id: '4', label: t('ai.promptPeakHours'), icon: 'trending-up' },
  ];

  const greetingText = t('ai.greeting', {
    name: user?.name?.trim().split(/\s+/)[0] || 'Partner',
  });

  const [messages, setMessages] = useState<Message[]>([
    { id: 'greet', role: 'assistant', text: greetingText },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = async (text: string = inputText) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: nextId(), role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInputText('');
    setIsTyping(true);

    const history = [...messages, userMsg]
      .filter((m) => m.text)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const currentLanguage = getAppLanguage();
      const data = await authedFetch('/api/assistant/chat', token, {
        method: 'POST',
        body: {
          messages: history,
          language: currentLanguage,
        },
      });
      const reply = String(data?.reply || '').trim() || t('ai.fallbackReply');
      const blocks = Array.isArray(data?.blocks) ? (data.blocks as Block[]) : undefined;
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: reply, blocks }]);
    } catch (error) {
      console.warn('[AskEmatix] assistant request failed', error);
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: t('ai.offlineReply') }]);
    } finally {
      setIsTyping(false);
    }
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
              <Text style={styles.heroTitle}>{t('ai.conciergeTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('ai.conciergeSubtitle')}</Text>
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
                <RichMessage
                  blocks={msg.id === 'greet' ? undefined : msg.blocks}
                  text={msg.id === 'greet' ? greetingText : msg.text}
                  textColor={msg.role === 'user' ? colors.onPrimary : colors.onSurface}
                />
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={styles.row}>
              <View style={styles.assistantAvatar}>
                <MaterialIcon name="auto-awesome" size={14} color={colors.onPrimary} />
              </View>
              <View style={[styles.bubble, styles.assistantBubble, { paddingVertical: 0 }]}>
                <TypingIndicator />
              </View>
            </View>
          )}

          {/* Suggestions */}
          <View style={styles.promptWrap}>
            <Text style={styles.promptLabel}>{t('ai.suggestions')}</Text>
            <View style={styles.promptChips}>
              {driverPrompts.map((p) => (
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
              placeholder={t('ai.askPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              activeOpacity={0.85}
              disabled={!inputText.trim() || isTyping}
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
