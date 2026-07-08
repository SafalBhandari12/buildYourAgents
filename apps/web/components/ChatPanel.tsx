'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ApiError, parseRagSources, sendChatMessage, type ChatSource } from '@/lib/api';
import { useAuthModal } from '@/components/AuthModalContext';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
};

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hello! I'm ready to answer questions based on your uploaded knowledge base. Try asking me something about a document you've ingested.",
};

export function ChatPanel({
  isAuthenticated,
  onMessageSent,
}: {
  isAuthenticated: boolean;
  onMessageSent: () => void;
}) {
  const { open } = useAuthModal();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    if (!isAuthenticated) {
      open('signin');
      return;
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setInput('');
    setIsSending(true);
    scrollToBottom();

    try {
      const res = await sendChatMessage(message);
      const sources = parseRagSources(res);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
          scrollToBottom();
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false, sources } : m)),
      );
      onMessageSent();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Something went wrong sending that message.';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false, content: message } : m)),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="px-4 pt-2 flex justify-end flex-shrink-0">
        <button
          onClick={() => setMessages([GREETING])}
          className="text-gray-600 hover:text-gray-1000 transition-colors"
          title="Clear conversation"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-grow px-4 pb-3 overflow-y-auto flex flex-col gap-3">
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <div key={m.id} className="flex flex-col items-start max-w-[88%]">
              <span className="text-label-12 text-gray-600 mb-1 ml-1">RAG Agent</span>
              <div className="bg-background-100 px-3 py-2.5 rounded-lg rounded-tl-none">
                <p className="text-copy-14 text-gray-1000 whitespace-pre-wrap">
                  {m.content}
                  {m.isStreaming && <span className="animate-pulse">▍</span>}
                </p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.map((s) => (
                      <div
                        key={s.source}
                        className="text-xs text-gray-600 flex gap-1 items-center bg-gray-200 px-2 py-1 rounded-md"
                      >
                        <span className="material-symbols-outlined text-[12px]">description</span>
                        <span className="text-label-12">Source: {s.source}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex flex-col items-end max-w-[88%] self-end">
              <span className="text-label-12 text-gray-600 mb-1 mr-1">You</span>
              <div className="bg-gray-1000 text-background-100 px-3 py-2.5 rounded-lg rounded-tr-none">
                <p className="text-copy-14">{m.content}</p>
              </div>
            </div>
          ),
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-4">
        <div className="relative">
          <input
            className="input-field w-full pr-10"
            placeholder="Ask a question…"
            type="text"
            value={input}
            disabled={isSending}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-1000 p-1 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </div>
      </form>
    </>
  );
}
