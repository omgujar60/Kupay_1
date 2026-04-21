import { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, MessageCircle, Users, ArrowLeft, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/hooks/use-auth';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

export function MobileLayout({ children, title, showBack, backTo }: MobileLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: Receipt, label: 'Spend', path: '/expenses' },
    { icon: MessageCircle, label: 'Coach', path: '/chat' },
    { icon: Users, label: 'Family', path: '/family' },
  ];

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className="flex justify-center bg-neutral-100 min-h-[100svh]">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-[480px] bg-white h-[100svh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* App Header */}
        <header className="h-[calc(64px+env(safe-area-inset-top,0px))] flex items-end pb-4 px-4 border-b border-neutral-100 sticky top-0 bg-white/80 backdrop-blur-md z-30 pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center w-full">
            {showBack && (
              <button onClick={handleBack} className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-neutral-900" />
              </button>
            )}
            <h1 className={cn(
              "text-lg font-bold tracking-tight text-neutral-900 ml-2 flex-1",
              !showBack && "ml-0"
            )}>
              {title || 'Kupay'}
            </h1>
            <button 
              onClick={logout} 
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-red-500"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom,20px))] scroll-smooth">
          <div className="animate-in fade-in duration-500">
            {children}
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-[480px] bg-white/95 backdrop-blur-lg border-t border-neutral-100 px-6 flex items-center justify-between z-40 pb-[env(safe-area-inset-bottom,16px)] pt-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex flex-col items-center gap-1.5 p-2 transition-all duration-300 relative",
                  isActive ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300",
                  isActive ? "bg-neutral-900/5" : ""
                )}>
                  <Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest transition-opacity duration-300",
                  isActive ? "opacity-100" : "opacity-60"
                )}>
                  {item.label}
                </span>
                {isActive && (
                    <motion.div 
                      layoutId="nav-dot"
                      className="absolute -bottom-1 w-1 h-1 bg-neutral-900 rounded-full" 
                    />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
