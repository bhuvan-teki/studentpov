import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";

type Message = {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  channel?: string;
  profiles?: {
    anonymous_username?: string | null;
    avatar_url?: string | null;
    avatar_seed?: string | null;
  } | null;
};

type CurrentProfile = {
  anonymous_username: string | null;
  verification_status: string | null;
  college_id: string | null;
};

const PUBLIC_IDENTITY_PATTERN =
  /^[a-z]+-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/;

function hasValidPublicIdentity(username?: string | null) {
  return Boolean(username && PUBLIC_IDENTITY_PATTERN.test(username));
}

function getPublicIdentity(username?: string | null) {
  return hasValidPublicIdentity(username) ? username! : "identity-pending";
}

export function ChatRoom({
  collegeId,
  verified,
  channel = "welcome",
}: {
  collegeId: string;
  verified: boolean;
  channel?: string;
}) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [identityRequired, setIdentityRequired] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          profile_id,
          channel,
          profiles (
            anonymous_username,
            avatar_url,
            avatar_seed
          )
        `)
        .eq("college_id", collegeId)
        .eq("channel", channel)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!active) return;

      if (error) {
        console.error("MESSAGES FETCH ERROR:", error);
        toast.error("Could not load messages.");
        setMessages([]);
      } else {
        setMessages(((data || []) as Message[]).reverse());
      }

      setLoading(false);
    };

    fetchMessages();

    const chatChannel = supabase
      .channel(`chat-${collegeId}-${channel}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `college_id=eq.${collegeId}`,
        },
        async (payload) => {
          if (!active) return;

          if (payload.eventType === "INSERT") {
            const insertedMessage = payload.new as Message;

            if (insertedMessage.channel !== channel) return;

            const { data, error } = await supabase
              .from("messages")
              .select(`
                id,
                content,
                created_at,
                profile_id,
                channel,
                profiles (
                  anonymous_username,
                  avatar_url,
                  avatar_seed
                )
              `)
              .eq("id", insertedMessage.id)
              .single();

            if (!active) return;

            if (error || !data) {
              console.error("REALTIME MESSAGE FETCH ERROR:", error);
              return;
            }

            setMessages((current) => {
              if (current.some((message) => message.id === data.id)) {
                return current;
              }

              return [...current, data as Message];
            });
          }

          if (payload.eventType === "UPDATE") {
            const updatedMessage = payload.new as Message;

            if (updatedMessage.channel !== channel) return;

            const { data, error } = await supabase
              .from("messages")
              .select(`
                id,
                content,
                created_at,
                profile_id,
                channel,
                profiles (
                  anonymous_username,
                  avatar_url,
                  avatar_seed
                )
              `)
              .eq("id", updatedMessage.id)
              .single();

            if (!active) return;

            if (error || !data) {
              console.error("UPDATED MESSAGE FETCH ERROR:", error);
              return;
            }

            setMessages((current) =>
              current.map((message) =>
                message.id === data.id ? (data as Message) : message
              )
            );
          }

          if (payload.eventType === "DELETE") {
            const deletedMessage = payload.old as Message;

            setMessages((current) =>
              current.filter((message) => message.id !== deletedMessage.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(chatChannel);
    };
  }, [collegeId, channel]);

  useEffect(() => {
    let active = true;

    if (!user) {
      setIdentityRequired(false);
      return;
    }

    const checkIdentity = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("anonymous_username, verification_status, college_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("CHATROOM PROFILE FETCH ERROR:", error);
        setIdentityRequired(false);
        return;
      }

      const profile = data as CurrentProfile | null;
      const identityReady = hasValidPublicIdentity(profile?.anonymous_username);
      const accountVerified = profile?.verification_status === "verified";
      const collegeMatches = profile?.college_id === collegeId;

      setIdentityRequired(
        Boolean(!identityReady || !accountVerified || !collegeMatches)
      );
    };

    checkIdentity();

    return () => {
      active = false;
    };
  }, [user, collegeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("Sign in to send messages.");
      return;
    }

    if (identityRequired) {
      toast.error("Set your anonymous identity before chatting.");
      return;
    }

    if (!verified) {
      toast.error("Only verified students can send messages.");
      return;
    }

    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      college_id: collegeId,
      profile_id: user.id,
      channel,
      content: messageText,
    });

    if (error) {
      console.error("MESSAGE INSERT ERROR:", error);
      toast.error(error.message);
      setNewMessage(messageText);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("MESSAGE DELETE ERROR:", error);
      toast.error(error.message);
    }
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

    if (error) {
      console.error("MESSAGE UPDATE ERROR:", error);
      toast.error(error.message);
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
    <div className="flex-1 flex flex-col h-full bg-background relative">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 scroll-smooth flex flex-col"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No messages yet in #{channel}</p>
            <p className="text-xs mt-1 opacity-70">
              Be the first verified student to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const previousMessage = messages[index - 1];
            const isConsecutive =
              index > 0 && previousMessage?.profile_id === msg.profile_id;

            const name = getPublicIdentity(msg.profiles?.anonymous_username);

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
                    <Avatar
                      url={msg.profiles?.avatar_url}
                      seed={
                        hasValidPublicIdentity(msg.profiles?.anonymous_username)
                          ? msg.profiles?.avatar_seed || name
                          : "identity-pending"
                      }
                      name={name}
                      size={40}
                    />
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
        {user && identityRequired ? (
          <div className="bg-white/[0.06] rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Choose your anonymous identity before chatting.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/login";
              }}
              className="shrink-0 rounded-md bg-primary text-primary-foreground px-3 py-2 text-[12px] font-medium hover:opacity-90 transition"
            >
              Set identity
            </button>
          </div>
        ) : verified && user ? (
          <form
            onSubmit={sendMessage}
            className="bg-white/[0.06] rounded-lg p-1.5 pl-4 flex items-center gap-2 focus-within:bg-white/[0.08] transition-colors"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={`Message #${channel}`}
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
        ) : (
          <div className="bg-white/[0.06] rounded-lg px-4 py-3 text-sm text-muted-foreground">
            Browse anonymously — sign in with college email to chat.
          </div>
        )}
      </div>
    </div>
  );
}
