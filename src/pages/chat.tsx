import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { getFinancialAdvice, SpendingSummary } from '@/src/services/gemini';
import { Wallet, Send, Bot, User, Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

import { cn } from '@/src/lib/utils';
import { MobileLayout } from '@/src/components/mobile-layout';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Namaste! I'm Kupay. Ask me anything about your family's budget, saving habits, or expenses!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchSpendingSummary = async (): Promise<SpendingSummary> => {
    if (!profile?.familyId) return { total: 0, categories: [] };
    
    const q = query(collection(db, 'expenses'), where('familyId', '==', profile.familyId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => doc.data());
    
    const total = data.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const categoryMap: Record<string, number> = {};

    data.forEach((d: any) => {
      const cat = d.category || 'Transfers';
      categoryMap[cat] = (categoryMap[cat] || 0) + (d.amount || 0);
    });

    return {
      total,
      categories: Object.entries(categoryMap).map(([name, amount]) => ({ name, amount }))
    };
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !user || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const summary = await fetchSpendingSummary();
      const advice = await getFinancialAdvice(userMsg, summary);
      setMessages(prev => [...prev, { role: 'ai', text: advice || "I'm sorry, I couldn't process that. Let's try another question." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to AI. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout title="AI Coach">
       <div className="flex flex-col h-[calc(100svh-calc(64px+env(safe-area-inset-top,0px))-calc(80px+env(safe-area-inset-bottom,20px)))] overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4 scroll-smooth" ref={scrollRef}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] px-4 py-3 rounded-[1.8rem] text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-neutral-900 text-white rounded-br-none" 
                    : "bg-neutral-100 text-neutral-900 rounded-bl-none"
                )}>
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 px-5 py-4 rounded-[1.8rem] rounded-bl-none shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-neutral-100 pb-8">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-neutral-50 p-1 rounded-[2rem] border border-neutral-100 shadow-inner">
               <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your coach..."
                className="flex-1 border-none bg-transparent h-12 px-5 focus-visible:ring-0 text-sm font-medium"
                disabled={loading}
               />
               <Button 
                type="submit"
                size="icon" 
                disabled={!input.trim() || loading}
                className="rounded-full bg-neutral-900 h-10 w-10 shrink-0 shadow-lg hover:scale-105 transition-transform"
               >
                 <Send className="w-4 h-4" />
               </Button>
            </form>
          </div>
       </div>
    </MobileLayout>
  );
}
