import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

export default function AuthPage() {
  const { user, profile, signIn, loading } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('admin');
  const [familyCode, setFamilyCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      navigate('/dashboard');
    } else if (user && !profile) {
      setIsNewUser(true);
    }
  }, [user, profile, navigate]);

  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (role === 'member') {
        if (!familyCode.trim()) {
          toast.error("Please enter a family code");
          return;
        }

        // Validate family code
        const q = query(collection(db, 'families'), where('code', '==', familyCode.toUpperCase()));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          toast.error("Invalid family code");
          return;
        }
        
        const family = snapshot.docs[0].data();
        
        // Create user doc
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name || user.displayName || 'Anonymous User',
          email: user.email,
          role: role,
          approved: false, // Wait for admin to approve
          familyId: family.id,
          photoURL: user.photoURL || ''
        });

        // Create join request
        await setDoc(doc(collection(db, 'joinRequests')), {
          userId: user.uid,
          userName: name || user.displayName || 'Anonymous User',
          familyId: family.id,
          status: 'pending',
          timestamp: new Date().toISOString()
        });

        toast.success("Join request sent to family admin!");
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name || user.displayName || 'Anonymous User',
          email: user.email,
          role: role,
          approved: true, // Admins are self-approved
          photoURL: user.photoURL || ''
        });
        toast.success("Circle Admin setup complete!");
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete setup");
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white font-black tracking-widest uppercase text-xs animate-pulse italic">Kupay...</div>;

  return (
    <div className="flex justify-center bg-neutral-100 min-h-[100svh]">
      <div className="w-full max-w-[480px] bg-white min-h-[100svh] flex flex-col p-8 shadow-2xl relative overflow-hidden pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]">
        
        {/* Simple Header */}
        <div className="pt-10 pb-12 space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900 leading-[0.9] italic">
                {isNewUser ? "Final\nStep." : "Welcome\nBack."}
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em]">
                {isNewUser ? "Choose your family role" : "Secure family financial tracking"}
            </p>
        </div>

        {!isNewUser ? (
          <div className="flex-1 flex flex-col justify-between py-10">
            <div className="space-y-12">
               <div className="w-20 h-20 bg-neutral-900 rounded-[2rem] flex items-center justify-center shadow-2xl">
                 <Wallet className="text-white w-10 h-10" />
               </div>
               <p className="text-sm text-neutral-500 leading-relaxed font-medium">
                  Log in to sync your family's expenses and get smart financial coaching from Kupay.
               </p>
            </div>
            
            <div className="space-y-4">
              <Button onClick={signIn} className="w-full h-16 rounded-[2rem] bg-neutral-900 text-white font-bold text-lg shadow-xl active:scale-95 transition-all">
                Continue with Google
              </Button>
              <p className="text-center text-[9px] text-neutral-300 font-black uppercase tracking-[0.3em]">Encrypted & Secure</p>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <form onSubmit={handleFinishProfile} className="space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Display Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={user?.displayName || "Your Name"}
                  className="h-14 rounded-2xl bg-neutral-50 border-none px-6 font-bold"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Your Role</Label>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    type="button"
                    onClick={() => setRole('admin')}
                    className={cn(
                        "p-6 rounded-[2rem] text-left border-2 transition-all flex items-center justify-between group",
                        role === 'admin' ? "border-neutral-900 bg-neutral-50" : "border-neutral-100 bg-white"
                    )}
                  >
                    <div>
                        <p className="font-black text-sm uppercase tracking-tight">Circle Admin</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Create and manage family</p>
                    </div>
                    {role === 'admin' && <div className="w-6 h-6 bg-green-500 rounded-full" />}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setRole('member')}
                    className={cn(
                        "p-6 rounded-[2rem] text-left border-2 transition-all flex items-center justify-between group",
                        role === 'member' ? "border-neutral-900 bg-neutral-50" : "border-neutral-100 bg-white"
                    )}
                  >
                    <div>
                        <p className="font-black text-sm uppercase tracking-tight">Circle Member</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Join an existing family</p>
                    </div>
                    {role === 'member' && <div className="w-6 h-6 bg-green-500 rounded-full" />}
                  </button>

                  {role === 'member' && (
                    <div className="space-y-2 pt-2 animate-in slide-in-from-top-4 duration-300">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Family Invite Code</Label>
                      <Input 
                        value={familyCode} 
                        onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} 
                        placeholder="ABC-123"
                        className="h-14 rounded-2xl bg-neutral-50 border-2 border-neutral-100 px-6 font-black tracking-[0.2em] text-center text-lg"
                      />
                      <p className="text-[9px] text-neutral-400 font-bold text-center uppercase tracking-widest px-6">
                        Ask your Family Admin for their unique code
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-16 rounded-[2rem] bg-neutral-900 text-white font-bold text-lg shadow-xl mt-4">
                Complete Setup
              </Button>
            </form>
          </div>
        )}

        {/* Flare */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-neutral-900/5 rounded-full blur-[80px] pointer-events-none" />
      </div>
    </div>
  );
}
