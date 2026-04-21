import { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collection, doc, setDoc, updateDoc, getDoc, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Users, UserPlus, Copy, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { MobileLayout } from '@/src/components/mobile-layout';

export default function FamilyPage() {
  const { user, profile } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [joiningCode, setJoiningCode] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [currentFamily, setCurrentFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.familyId) return;
    
    const unsubFamily = onSnapshot(doc(db, 'families', profile.familyId), 
      (doc) => {
        setCurrentFamily(doc.data());
      },
      (error) => {
        if (error.code !== 'permission-denied') console.error("Family Listener Error:", error);
      }
    );

    const qMembers = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
    const unsubMembers = onSnapshot(qMembers, 
      (snapshot) => {
        setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        if (error.code !== 'permission-denied') console.error("Family Members Listener Error:", error);
      }
    );

    if (profile.role === 'admin') {
      const q = query(collection(db, 'joinRequests'), where('familyId', '==', profile.familyId), where('status', '==', 'pending'));
      const unsubRequests = onSnapshot(q, 
        (snapshot) => {
          setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        },
        (error) => {
          if (error.code !== 'permission-denied') console.error("Requests Listener Error:", error);
        }
      );
      return () => { unsubFamily(); unsubMembers(); unsubRequests(); };
    }

    return () => { unsubFamily(); unsubMembers(); };
  }, [profile]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 3; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 3; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim() || !user) return;
    const code = generateCode();
    const familyRef = doc(collection(db, 'families'));
    try {
      await setDoc(familyRef, {
        id: familyRef.id,
        name: familyName,
        code: code,
        adminId: user.uid,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        familyId: familyRef.id,
        role: 'admin',
        approved: true
      });
      toast.success("Family circle created!");
    } catch (e) {
      toast.error("Failed to create family");
    }
  };

  const handleJoinRequest = async () => {
    if (!joiningCode.trim() || !user) return;
    try {
      // Check for existing request
      const qExisting = query(
        collection(db, 'joinRequests'), 
        where('userId', '==', user.uid), 
        where('status', '==', 'pending')
      );
      const existingSnap = await getDocs(qExisting);
      if (!existingSnap.empty) {
        toast.info("A request is already pending");
        return;
      }

      const q = query(collection(db, 'families'), where('code', '==', joiningCode));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast.error("Invalid family code");
        return;
      }
      const family = snapshot.docs[0].data();
      await addDoc(collection(db, 'joinRequests'), {
        userId: user.uid,
        userName: profile?.name || user.displayName,
        familyId: family.id,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      toast.success("Join request sent to admin!");
      setJoiningCode('');
    } catch (e) {
      toast.error("Failed to send request");
    }
  };

  const handleApprove = async (request: any) => {
    try {
      await updateDoc(doc(db, 'joinRequests', request.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', request.userId), { 
        familyId: request.familyId,
        role: 'member',
        approved: true
      });
      toast.success("Member approved!");
    } catch (e) {
      toast.error("Approval failed");
    }
  };

  const copyCode = () => {
    if (currentFamily?.code) {
      navigator.clipboard.writeText(currentFamily.code);
      toast.success("Invite code copied!");
    }
  };

  return (
    <MobileLayout title="Family">
      <div className="p-4 space-y-6">
        {!profile?.familyId ? (
          <div className="space-y-8 pt-10">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-neutral-900 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl mb-2 rotate-3">
                 <Users className="text-white w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-black tracking-tighter text-neutral-900">Family Circle</h2>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.3em]">Track. Share. Grow Together.</p>
              </div>
            </div>
            
            <Tabs defaultValue="join" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-neutral-100 p-1">
                <TabsTrigger value="join" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest py-2">Join</TabsTrigger>
                <TabsTrigger value="create" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest py-2">Create</TabsTrigger>
              </TabsList>
              
              <TabsContent value="join" className="pt-6">
                <Card className="rounded-[2.5rem] border-none bg-neutral-50 p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Family Code</Label>
                    <Input 
                      placeholder="SHR-123" 
                      value={joiningCode}
                      onChange={(e) => setJoiningCode(e.target.value.toUpperCase())}
                      className="h-14 rounded-2xl bg-white border-none text-center text-2xl font-black tracking-[0.2em]"
                    />
                  </div>
                  <Button onClick={handleJoinRequest} className="w-full h-14 rounded-2xl bg-neutral-900 font-bold text-base shadow-xl">
                    Request to Join
                  </Button>
                </Card>
              </TabsContent>
              
              <TabsContent value="create" className="pt-6">
                <Card className="rounded-[2.5rem] border-none bg-neutral-50 p-6 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4">Family Name</Label>
                      <Input 
                        placeholder="e.g. The Sharma Family" 
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        className="h-14 rounded-2xl bg-white border-none text-center text-sm font-bold"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 font-medium leading-relaxed text-center uppercase tracking-widest px-4">
                      You will become the <b>Circle Admin</b>
                    </p>
                    <Button onClick={handleCreateFamily} className="w-full h-14 rounded-2xl bg-neutral-900 font-bold text-base shadow-xl">
                      Start New Circle
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-8 pb-12">
            {/* Admin Controls */}
            {profile.role === 'admin' && (
              <Card className="rounded-[2.5rem] border-none bg-neutral-900 text-white p-8 relative overflow-hidden shadow-2xl">
                <div className="relative z-10 space-y-6">
                   <div className="space-y-1">
                      <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]">Family Invite Code</p>
                      <h3 className="text-3xl min-[370px]:text-4xl min-[400px]:text-5xl font-black italic tracking-tighter text-white break-all">{currentFamily?.code}</h3>
                   </div>
                   <Button 
                    onClick={copyCode} 
                    variant="secondary" 
                    className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-[11px] shadow-lg"
                   >
                    Copy & Share Code
                   </Button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              </Card>
            )}

            {/* Non-Admin Status Card */}
            {profile.role !== 'admin' && (
              <Card className="rounded-[2.5rem] border-none bg-neutral-50 p-8 text-center space-y-2">
                <div className={cn(
                  "w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4",
                  !profile.approved && "animate-pulse"
                )}>
                  <Users className="text-white w-8 h-8" />
                </div>
                <h3 className="text-xl font-black tracking-tight">{currentFamily?.name}</h3>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                  {profile.approved ? 'Active Member' : 'Pending Approval'}
                </p>
                {!profile.approved && (
                  <p className="text-[10px] text-neutral-400 font-medium leading-relaxed max-w-[200px] mx-auto pt-2">
                    Waiting for the Family Admin to approve your request.
                  </p>
                )}
              </Card>
            )}

            {/* Approved Members List */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-4">Circle Members</h3>
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="bg-neutral-50 border border-neutral-100/50 p-4 rounded-3xl flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-bold text-neutral-900 shadow-sm">
                          {member.name?.[0] || member.email?.[0]}
                       </div>
                       <div>
                          <p className="text-sm font-bold tracking-tight">{member.name || 'Anonymous'}</p>
                          <p className="text-[8px] text-neutral-400 uppercase font-bold tracking-widest">
                            {member.id === currentFamily?.adminId ? 'Owner' : 'Member'}
                          </p>
                       </div>
                    </div>
                    {member.id === user?.uid && (
                      <div className="px-2 py-1 bg-neutral-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm">
                        You
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests */}
            {profile.role === 'admin' && requests.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-4">Join Requests</h3>
                <div className="space-y-3">
                  {requests.map((req) => (
                    <motion.div 
                      key={req.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-neutral-100 p-5 rounded-[2rem] flex justify-between items-center shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center font-black text-neutral-900 border border-neutral-100">
                          {req.userName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight">{req.userName}</p>
                          <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Wants to join</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(req)}
                        className="rounded-full bg-neutral-900 px-5 font-bold h-10 shadow-lg text-xs"
                      >
                        Approve
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
