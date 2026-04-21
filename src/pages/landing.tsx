import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Wallet, Users, MessageSquare, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex justify-center bg-neutral-100 min-h-[100svh]">
      <div className="w-full max-w-[480px] bg-neutral-900 min-h-[100svh] flex flex-col relative overflow-hidden shadow-2xl pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,20px)]">
        <header className="p-8 relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Wallet className="text-neutral-900 w-6 h-6" />
                </div>
                <span className="text-white text-xl font-black tracking-tighter">Kupay</span>
            </div>
            <Link to="/auth">
               <Button variant="ghost" className="text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest">Login</Button>
            </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-10 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-6xl font-black tracking-tighter text-white leading-[0.85] italic">
                Family<br />
                Finance<br />
                Freedom.
              </h1>
              <p className="text-neutral-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto uppercase tracking-widest opacity-80">
                The digital dining table for your household finances.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Link to="/auth">
                <Button className="w-full h-16 rounded-[2rem] bg-white text-neutral-900 font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Get Started
                </Button>
              </Link>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.3em]">Built for India</p>
            </div>
          </motion.div>
        </main>

        <div className="p-8 relative z-10">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] backdrop-blur-sm">
                 <Users className="w-6 h-6 text-white/40 mb-2" />
                 <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Family Sync</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] backdrop-blur-sm">
                 <MessageSquare className="w-6 h-6 text-white/40 mb-2" />
                 <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">AI Coach</p>
              </div>
           </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48 blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
}
