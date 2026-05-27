import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Message = {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  profiles?: {
    display_name?: string | null;
    email?: string | null;
  } | null;
};

export function ChatRoom({ collegeId }: { collegeId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          profile_id,
          profiles (
            display_name,
            email
          )
        `)
        .eq("college_id", collegeId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data as Message[]);
      setLoading(false);
    };

    fetchMessages();

    const chatChannel = supabase
      .channel(`chat-${collegeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `college_id=eq.${collegeId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", newMsg.profile_id)
            .maybeSingle();

          const completeMessage = {
            ...newMsg,
            profiles: profileData,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === completeMessage.id)) return prev;
            return [...prev, completeMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [collegeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      college_id: collegeId,
      profile_id: user.id,
      content: messageText,
    });

    if (error) {
      console.error(error.message);
      setNewMessage(messageText);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">Welcome to #general-chat</p>
            <p className="text-xs mt-1 opacity-70">
              Start the first campus conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const name =
              msg.profiles?.display_name ||
              msg.profiles?.email?.split("@")[0] ||
              "anonymous student";

            const initial = name[0]?.toUpperCase() || "A";

            return (
              <div
                key={msg.id}
                className="group flex gap-3 px-2 py-2 rounded-md hover:bg-white/[0.035] transition"
              >
                <div className="h-9 w-9 rounded-full bg-white/[0.08] border border-white/[0.08] grid place-items-center text-[12px] font-semibold shrink-0">
                  {initial}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-foreground">
                      {name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 md:px-6 pb-4 md:pb-6 pt-3 border-t border-white/[0.04]">
        <form
          onSubmit={sendMessage}
          className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2 px-4 focus-within:border-white/[0.12] transition"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message #general-chat"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground/60"
          />

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="h-8 w-8 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-white/[0.06] disabled:opacity-30 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
