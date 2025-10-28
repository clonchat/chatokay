"use client";

import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useAction, useQuery } from "convex/react";
import { Bot, Menu, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSidebar } from "./context";

export default function ChatPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { toggleSidebar, business: layoutBusiness } = useSidebar();

  // Call Convex directly instead of using the route handler
  const businessFromQuery = useQuery(
    api.businesses.getBySubdomain,
    layoutBusiness ? "skip" : subdomain ? { subdomain } : "skip"
  );

  const business = layoutBusiness || businessFromQuery;
  // Loading: no layout business AND query is still undefined
  const loading = !layoutBusiness && businessFromQuery === undefined;
  // Error: query finished but returned null (business not found)
  const error =
    businessFromQuery === null && !loading ? "Negocio no encontrado" : null;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant" | "system"; content: string }>
  >([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageAction = useAction(api.chat.sendMessage);

  // Generate a unique session ID that persists for this browser session
  // This gets reset on page refresh, ensuring fresh conversations
  const sessionIdRef = useRef<string>(
    `${subdomain}-${Date.now()}-${Math.random()}`
  );

  // Add welcome message when business loads
  useEffect(() => {
    if (business?.welcomeMessage && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: business.welcomeMessage,
        },
      ]);
    }
  }, [business, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !business || isSending) return;

    const userMessage = message;
    setMessage("");

    // Add user message
    const updatedMessages = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ];
    setMessages(updatedMessages);

    try {
      setIsSending(true);

      // Call Convex action
      const response = await sendMessageAction({
        messages: updatedMessages,
        subdomain: subdomain,
        sessionId: sessionIdRef.current,
      });

      if (!response || !response.content) {
        throw new Error("No response from server");
      }

      // Add complete assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content },
      ]);
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando chatbot...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <Bot className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">
            Chatbot no encontrado
          </h1>
          <p className="text-muted-foreground">
            {error || "No se pudo encontrar este negocio"}
          </p>
          <Button asChild>
            <a href="https://chatokay.com">Ir a ChatOkay</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with business info */}
      <header className="border-b bg-card border-border">
        <div className="max-w-4xl mx-auto py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {business.logo && (
              <img
                src={business.logo}
                alt={business.name}
                className="h-10 w-10 object-contain rounded bg-background p-1 border border-border"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {business.name}
              </h1>
              {business.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {business.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="text-sm sm:text-base break-words markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base break-words whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator when sending */}
          {isSending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-lg p-3 bg-muted text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-current animate-bounce" />
                  <span
                    className="w-2 h-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-card border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isSending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-2">
          {business.phone && (
            <p className="text-center text-xs text-muted-foreground mb-1">
              📞{" "}
              <a
                href={`tel:${business.phone}`}
                className="text-foreground hover:text-primary"
              >
                {business.phone}
              </a>
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://chatokay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              ChatOkay
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
