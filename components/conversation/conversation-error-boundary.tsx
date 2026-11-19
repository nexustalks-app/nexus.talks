'use client';

import React, { Component, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ConversationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ConversationErrorBoundary] Caught client error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[var(--pane-chat-bg)] px-6 py-12 text-center text-[var(--foreground)]">
          <div className="w-full max-w-sm rounded-3xl border border-stone/80 dark:border-white/10 bg-white/90 dark:bg-[#1C161B]/90 p-6 shadow-xl backdrop-blur-md nx-dialog-enter">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
              <AlertCircle className="h-6 w-6 stroke-[2]" />
            </div>

            <h3 className="text-base font-bold text-charcoal dark:text-white">
              {this.props.fallbackTitle || 'Conversation temporary issue'}
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-muted dark:text-[#A8A2A6]">
              We had trouble displaying this conversation right now. Your messages are safely stored on the server.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-wine hover:bg-wine-hover text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload messages</span>
              </button>

              <Link
                href="/conversations"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-strong/70 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-4 text-xs font-semibold text-charcoal dark:text-white transition-all active:scale-95"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted" />
                <span>Conversations</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
