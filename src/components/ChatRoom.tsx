import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

export function ChatRoom({
  collegeId,
  verified,
}: {
  collegeId: string;
  verified: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
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

      if (!error && data) setMessages(data as Message[]);
      setLoading(false);
    };

    fetchMessages();

    const chatChannel = supabase
      .channel(`chat-${collegeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `college_id=eq.${collegeId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
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

            setMessages((current) => {
              if (current.some((m) => m.id === completeMessage.id)) {
                return current;
              }
              return [...current, completeMessage];
            });
          }

          if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new as Message;

            setMessages((current) =>
              current.map((m) =>
                m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
              )
            );
          }

          if (payload.eventType === "DELETE") {
            const deletedMsg = payload.old as Message;

            setMessages((current) =>
              current.filter((m) => m.id !== deletedMsg.id)
            );
          }
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

    if (!user) {
      toast.error("Sign in to chat");
      return;
    }

    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      college_id: collegeId,
      profile_id: user.id,
      content: messageText,
    });

    if (error) {
      toast.error(error.message);
      setNewMessage(messageText);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) toast.error(error.message);
  };

  const editMessage = async (messageId: string, oldContent: string) => {
    const nextContent = prompt("Edit message:", oldContent);

    if (!nextContent) return;

    const cleanContent = nextContent.trim();

    if (!cleanContent || cleanContent === oldContent) return;

    const { error } = await supabase
      .from("messages")
      .update({ content: cleanContent })
      .eq("id", messageId);

    if (error) toast.error(error.message);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 scroll-smooth flex flex-col"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">Welcome to the general chat!</p>
            <p className="text-xs mt-1 opacity-70">Say hi to your campus.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isConsecutive =
              index > 0 && messages[index - 1].profile_id === msg.profile_id;

            const name =
              msg.profiles?.display_name ||
              msg.profiles?.email?.split("@")[0] ||
              "anonymous student";

            const initial = name[0]?.toUpperCase() || "A";

            const timeString = new Date(msg.created_at).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <div
                key={msg.id}
                className={`group flex px-4 md:px-6 py-0.5 hover:bg-white/[0.03] transition-colors ${
                  isConsecutive ? "mt-0" : "mt-4"
                }`}
              >
                <div className="w-10 shrink-0 mr-4 flex justify-center mt-0.5">
                  {!isConsecutive ? (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-foreground/80">
                      {initial}
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground mt-1">
                      {timeString}
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  {!isConsecutive && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[15px] font-medium text-foreground">
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeString}
                      </span>
                    </div>
                  )}

                  <div className="text-[15px] text-foreground/90 leading-[1.375rem] whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>

                  {msg.profile_id === user?.id && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-3 mt-1 text-[11px] text-muted-foreground">
                      <button
                        onClick={() => editMessage(msg.id, msg.content)}
                        className="hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 md:px-6 pb-6 pt-2 bg-background">
        <form
          onSubmit={sendMessage}
          className="bg-white/[0.06] rounded-lg p-1.5 pl-4 flex items-center gap-2 focus-within:bg-white/[0.08] transition-colors"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message #general-chat"
            className="flex-1 bg-transparent outline-none text-[15px] py-1.5 placeholder:text-muted-foreground/50"
          />

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.1] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
