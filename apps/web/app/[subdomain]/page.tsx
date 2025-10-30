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
import { Loading } from "@/components/loading";

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
    return <Loading variant="page" message="Cargando chatbot..." />;
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
    <div className="flex flex-col min-h-[100dvh]">
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
              <Menu className="h-5 w-5 text-foreground" />
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
      <div className="flex-1 min-h-0 overflow-y-auto py-6 px-4">
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
              className="flex-1 text-foreground"
            />
            <Button type="submit" size="icon" disabled={isSending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {(business.email || business.phone) && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs mb-2">
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                  </svg>
                  <span>{business.email}</span>
                </a>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{business.phone}</span>
                </a>
              )}
            </div>
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
