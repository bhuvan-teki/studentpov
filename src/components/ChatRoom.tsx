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
            // MAGIC LOGIC: Check if this message was sent by the same person as the previous message
            const isConsecutive = index > 0 && messages[index - 1].profile_id === msg.profile_id;
            
            const initial = msg.profiles?.email?.[0].toUpperCase() || "A";
            const displayName = msg.profiles?.display_name || "anonymous student";
            
            const timeString = new Date(msg.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });

            return (
              <div 
                key={msg.id} 
                // Tighter padding, and smaller top-margin if it's a consecutive message
                className={`group flex px-4 md:px-6 py-0.5 hover:bg-white/[0.03] transition-colors ${isConsecutive ? "mt-0" : "mt-4"}`}
              >
                {/* Fixed-width Left Column for Avatars / Hover Timestamps */}
                <div className="w-10 shrink-0 mr-4 flex justify-center mt-0.5">
                  {!isConsecutive ? (
                    // Show Avatar for the first message
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-foreground/80 cursor-pointer hover:opacity-80 transition-opacity">
                      {initial}
                    </div>
                  ) : (
                    // Show Timestamp on hover for consecutive messages (Exactly like Discord)
                    <div className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground mt-1 cursor-default">
                      {timeString.split(" ")[0]}
                    </div>
                  )}
                </div>
                
                {/* Right Column for Content */}
                <div className="flex flex-col min-w-0 flex-1">
                  {!isConsecutive && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[15px] font-medium text-foreground hover:underline cursor-pointer">
                        {displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeString}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-[15px] text-foreground/90 leading-[1.375rem] whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Flat Discord-Style Input Bar */}
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
