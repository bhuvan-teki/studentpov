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

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, profile_id,
          profiles ( display_name, email )
        `)
        .eq('college_id', collegeId)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data as Message[]);
      setLoading(false);
    };

    fetchMessages();

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
      {/* Removed the heavy space-y-4 to allow tighter grouping like Discord */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">Welcome to the general chat!</p>
            <p className="text-xs mt-1 opacity-70">Say hi to your campus.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const initial = msg.profiles?.email?.[0].toUpperCase() || "A";
            const displayName = msg.profiles?.display_name || "anonymous student";
            
            // Format time exactly like Discord (e.g., "2:14 AM")
            const timeString = new Date(msg.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });

            return (
              <div 
                key={msg.id} 
                className="group flex gap-4 px-4 md:px-6 py-1 hover:bg-white/[0.02] transition-colors mt-3"
              >
                {/* Avatar (Always on the left) */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-foreground/80 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
                  {initial}
                </div>
                
                {/* Message Content Area */}
                <div className="flex flex-col min-w-0">
                  {/* Header: Name and Timestamp */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-medium text-foreground hover:underline cursor-pointer">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeString}
                    </span>
                  </div>
                  
                  {/* The actual message (No bubble, just raw text) */}
                  <div className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
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
          className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-2 pl-4 flex items-center gap-2 focus-within:border-white/20 transition-colors"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message #general-chat..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary disabled:opacity-30 hover:bg-primary/20 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
