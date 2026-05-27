import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Message = {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  profiles?: {
    display_name?: string;
    email?: string;
  };
};

export function ChatRoom({ collegeId }: { collegeId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial messages & subscribe to new ones
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, profile_id,
          profiles ( display_name, email )
        `)
        .eq('college_id', collegeId)
        .order('created_at', { ascending: true }); // Oldest at top, newest at bottom
        
      if (data) setMessages(data as Message[]);
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to real-time inserts
    const chatChannel = supabase
      .channel(`chat-${collegeId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `college_id=eq.${collegeId}` 
        },
        async (payload) => {
          // Fetch the profile info for the new message so we have their name/initials
          const newMsg = payload.new as Message;
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', newMsg.profile_id)
            .single();

          const completeMessage = { ...newMsg, profiles: profileData };
          setMessages((prev) => [...prev, completeMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [collegeId]);

  // 2. Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. Send message function
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input instantly for good UX

    await supabase.from('messages').insert({
      college_id: collegeId,
      profile_id: user.id,
      content: messageText,
    });
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
      {/* Chat Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">Welcome to the general chat!</p>
            <p className="text-xs mt-1 opacity-70">Say hi to your campus.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.profile_id === user?.id;
            // Basic fallback for initials
            const initial = msg.profiles?.email?.[0].toUpperCase() || "A";

            return (
              <div 
                key={msg.id} 
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-foreground/80 shrink-0 mb-1">
                    {initial}
                  </div>
                )}
                
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                  {/* Sender Name (only show for others) */}
                  {!isMe && (
                     <span className="text-[10px] text-muted-foreground/70 ml-1 mb-1">
                       {msg.profiles?.display_name || "Anonymous"}
                     </span>
                  )}
                  
                  {/* The Chat Bubble */}
                  <div 
                    className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words ${
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "glass-card text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-white/[0.04]">
        <form 
          onSubmit={sendMessage}
          className="glass-card rounded-full p-1.5 pl-4 flex items-center gap-2 focus-within:border-white/10 transition-colors"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message #general-chat..."
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="h-9 w-9 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
