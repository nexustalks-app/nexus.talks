'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Clock,
  Paperclip,
  Calendar,
  ArrowUp,
  Check,
} from 'lucide-react';
import { UserAvatar } from '@/components/user/user-avatar';
import { cn } from '@/lib/utils/cn';

export type CallType = 'voice' | 'video';

export interface CallRecipient {
  name: string;
  username?: string;
  avatarUrl?: string | null;
  id?: string;
  subtitle?: string;
  isCreator?: boolean;
}

export interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: CallType;
  recipient: CallRecipient;
  initialElapsedSeconds?: number;
}

interface InCallMessage {
  id: string;
  senderName: string;
  isOwn: boolean;
  content: string;
  timestamp: string;
  isImage?: boolean;
  imageUrl?: string;
}

export function CallModal({
  isOpen,
  onClose,
  callType,
  recipient,
  initialElapsedSeconds,
}: CallModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultStartingSeconds = initialElapsedSeconds ?? 0;

  const [elapsedSeconds, setElapsedSeconds] = useState(defaultStartingSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // In-call messages state (clean participant interaction, no hardcoded unrelated assets)
  const [messages, setMessages] = useState<InCallMessage[]>([]);

  // Live call timer
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(defaultStartingSeconds);
      setIsMuted(false);
      setIsCameraOff(false);
      return;
    }

    const intervalTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(intervalTimer);
    };
  }, [isOpen, defaultStartingSeconds]);

  // Handle ESC key to end call
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    setMessages((prev) => [
      ...prev,
      {
        id: `call-msg-${Date.now()}`,
        senderName: 'You',
        isOwn: true,
        content: trimmed,
        timestamp: timeStr,
      },
    ]);
    setInputText('');

    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  if (!isOpen || !mounted) return null;

  const callTypeLabel = callType === 'video' ? 'Video Call' : 'Voice Call';
  const displaySubtitle = recipient.subtitle || callTypeLabel;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${callTypeLabel} with ${recipient.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden select-none animate-fade-in"
    >
      {/* ── Main Phone Canvas Container ───────────────────────────────────── */}
      <div className="relative flex flex-col w-full h-full sm:h-[94vh] sm:max-h-[860px] sm:max-w-[430px] sm:rounded-[44px] sm:border sm:border-white/15 bg-gradient-to-b from-[#242126] via-[#1c1a1f] to-[#131115] shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-white select-none">
        {/* ── 1. Contact Header Bar ─────────────────────────────────────────── */}
        <header className="relative flex h-[82px] sm:h-[86px] shrink-0 items-center justify-between px-4 sm:px-5 z-20">
          {/* Upper Left: Back Control Pill */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to chat"
            title="Back to chat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2a272e]/80 hover:bg-[#343138] border border-white/[0.08] text-white transition-all active:scale-95 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>

          {/* Upper Center: Centered Circular DP, Name & Subtitle on exact central axis */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center justify-center text-center pointer-events-auto">
              {/* Circular DP */}
              <div className="relative mb-1">
                <UserAvatar
                  id={recipient.id || recipient.username}
                  display_name={recipient.name}
                  avatar_url={recipient.avatarUrl || null}
                  size="sm"
                  className="!h-9 !w-9 sm:!h-10 sm:!w-10 ring-1.5 ring-white/20 shadow-sm rounded-full"
                />
              </div>

              {/* Contact Name */}
              <div className="flex items-center justify-center gap-1.5">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-white tracking-tight leading-tight">
                  {recipient.name}
                </h2>
              </div>

              {/* Subtitle / Call Type */}
              <p className="mt-0.5 text-[11px] sm:text-[11.5px] font-normal text-[#8e8a92] leading-tight">
                {displaySubtitle}
              </p>
            </div>
          </div>

          {/* Upper Right: Distinct Red Decline / End-Call Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={`End ${callTypeLabel.toLowerCase()}`}
            title={`End ${callTypeLabel.toLowerCase()}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#b83a3a] hover:bg-[#a32e2e] text-white shadow-lg shadow-rose-950/50 border border-rose-400/30 transition-all duration-150 active:scale-95 z-10"
          >
            <PhoneOff className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        {/* ── 2. Call Active Stage: Voice vs Video ───────────────────────────── */}
        {callType === 'voice' ? (
          /* Voice Call Stage */
          <div className="flex flex-col items-center justify-center shrink-0 px-4 pt-3 pb-2 z-10 select-none">
            {/* Centered Large Avatar with subtle breathing ring */}
            <div className="relative mb-3 flex items-center justify-center">
              <UserAvatar
                id={recipient.id || recipient.username}
                display_name={recipient.name}
                avatar_url={recipient.avatarUrl || null}
                size="lg"
                className="!h-24 !w-24 rounded-full ring-2 ring-white/20 shadow-2xl"
              />
              <span className="absolute -inset-2 rounded-full border border-wine/40 animate-ping pointer-events-none opacity-20" />
            </div>

            {/* Voice status badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-medium text-[#d4d0d6] shadow-sm">
              <Phone className="h-3 w-3 text-emerald-400" />
              <span>Voice Call Connected</span>
            </div>

            {/* In-Call Audio Waveform Activity Visualizer */}
            <div className="flex items-center justify-center gap-1 my-3 h-5" aria-hidden="true">
              {[14, 20, 10, 24, 16, 28, 12, 22, 18, 10, 16].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-white/40 animate-pulse"
                  style={{
                    height: `${isMuted ? 4 : h}px`,
                    animationDelay: `${i * 90}ms`,
                    animationDuration: '900ms',
                  }}
                />
              ))}
            </div>

            {/* In-Call Audio Controls + Timer */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all border shadow-sm active:scale-95',
                  isMuted
                    ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                    : 'bg-[#2a272e] hover:bg-[#343138] border-white/15 text-white'
                )}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Call-Duration Indicator Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1c22]/90 border border-white/10 text-[12px] font-medium text-[#d4d0d6] shadow-sm">
                <Clock className="h-3.5 w-3.5 text-white/80" strokeWidth={2} />
                <span className="tabular-nums font-mono text-[12.5px] tracking-wide">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Video Call Stage */
          <div className="flex flex-col items-center justify-center shrink-0 px-4 pt-1 pb-1 z-10">
            <div className="relative w-[190px] sm:w-[220px] aspect-[3/4] max-h-[265px] rounded-[28px] overflow-hidden shadow-2xl border border-white/10 bg-[#161418] group">
              {/* Honest Camera-off placeholder (Req 8: Do not claim a real connection is active) */}
              <div className="relative flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-[#252229] via-[#1c1a20] to-[#131115] p-4 text-center select-none overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative mb-2">
                    <UserAvatar
                      id={recipient.id || recipient.username}
                      display_name={recipient.name}
                      avatar_url={recipient.avatarUrl || null}
                      size="lg"
                      className="!h-20 !w-20 rounded-full ring-2 ring-white/15 shadow-xl opacity-90"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-white/80 mt-1">
                    <VideoOff className="h-4 w-4 text-white/60" />
                    <span className="text-[12.5px] font-semibold tracking-tight text-white/90">Camera Off</span>
                  </div>

                  <span className="text-[10px] text-[#8e8a92] mt-0.5">
                    {isCameraOff ? 'Camera paused' : 'No camera stream active'}
                  </span>
                </div>
              </div>

              {/* In-Video Micro Controls Overlay */}
              <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md border transition-all active:scale-95',
                    isMuted
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                      : 'bg-black/60 border-white/15 text-white hover:bg-black/80'
                  )}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraOff((prev) => !prev)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md border transition-all active:scale-95',
                    isCameraOff
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                      : 'bg-black/60 border-white/15 text-white hover:bg-black/80'
                  )}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                  aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Call-Duration Indicator Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e1c22]/90 border border-white/10 text-[12px] font-medium text-[#d4d0d6] shadow-sm mt-3">
              <Clock className="h-3.5 w-3.5 text-white/80" strokeWidth={2} />
              <span className="tabular-nums font-mono text-[12.5px] tracking-wide">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>
        )}

        {/* ── 3. Integrated Conversation Surface ───────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#201e24] rounded-t-[32px] border-t border-x border-white/10 shadow-2xl mt-3 overflow-hidden">
          {/* Scrollable Conversation Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3 space-y-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  msg.isOwn ? 'items-end' : 'items-start'
                )}
              >
                {/* Sender Label */}
                {!msg.isOwn && (
                  <span className="text-[11.5px] font-medium text-[#a5a1a8] mb-1 ml-1 select-none">
                    {msg.senderName}
                  </span>
                )}

                {/* Message Bubble: Shared Image or Text */}
                {msg.isImage ? (
                  <div className="flex flex-col gap-1">
                    <div className="rounded-[20px] overflow-hidden max-w-[170px] sm:max-w-[190px] border border-white/10 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.imageUrl}
                        alt="Shared image"
                        className="w-full h-auto object-cover rounded-[20px]"
                      />
                    </div>
                    <span className="text-[10px] text-[#8e8a92] self-start ml-1 mt-0.5 select-none">
                      {msg.timestamp}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'rounded-[20px] px-3.5 py-2 max-w-[80%] text-[13.5px] leading-relaxed shadow-sm',
                      msg.isOwn
                        ? 'bg-[#38353c] text-white border border-white/[0.08]'
                        : 'bg-[#2b292f] text-[#f3f1f4] border border-white/[0.06]'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="flex justify-end items-center gap-1 text-[9.5px] text-[#8e8a92] mt-0.5 select-none">
                      <span>{msg.timestamp}</span>
                      {msg.isOwn && <Check className="h-2 w-2 stroke-[2.2] opacity-80" />}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── 4. Composer in the Integrated Call Screen ────────────────────── */}
          <div className="shrink-0 px-3 sm:px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-white/[0.06] bg-[#201e24]">
            <div className="flex items-center gap-2">
              {/* Rounded Input Pill */}
              <div className="flex flex-1 min-w-0 items-center gap-2 rounded-[22px] px-3.5 py-2 bg-[#2c2a30] border border-white/[0.08] focus-within:border-white/20 focus-within:bg-[#333038] transition-colors">
                <button
                  type="button"
                  aria-label="Add attachment"
                  title="Add attachment"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8e8a91] hover:text-white transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Send a message..."
                  className="flex-1 min-w-0 bg-transparent text-[13.5px] text-white placeholder:text-[#7d7981] focus:outline-none"
                />
              </div>

              {/* Calendar Button */}
              <button
                type="button"
                aria-label="Calendar"
                title="Calendar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#2c2a30] hover:bg-[#343138] border border-white/[0.08] text-[#8e8a91] hover:text-white transition-all active:scale-95 shadow-sm"
              >
                <Calendar className="h-4 w-4" />
              </button>

              {/* Send Button */}
              {inputText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleSendMessage}
                  aria-label="Send message"
                  title="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#19171b] hover:bg-white/90 shadow-md active:scale-90 transition-all"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.4]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
