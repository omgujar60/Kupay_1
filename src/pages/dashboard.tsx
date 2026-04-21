import { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/use-auth';
import { useSMSListener } from '@/src/hooks/use-sms-listener';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { parseSMS } from '@/src/services/gemini';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Wallet, Plus, Send, Zap, TrendingUp, Users, MessageCircle, Wifi, WifiOff, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

const COLORS = ['#141414', '#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'];

import { MobileLayout } from '@/src/components/mobile-layout';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { isListening, setIsListening, simulateIncomingSMS, syncHistory, isSyncing } = useSMSListener();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [smsText, setSmsText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Simulation helpers
  const testSmsPool = [
    "Rs.1200 spent at Amazon on 15 Apr",
    "Rs.45 processed for Zomato order #1234",
    "HDFC Bank: ₹5000 withdrawn at ATM #992",
    "Paid ₹250 to Reliance Fresh for groceries",
    "Transferred ₹3000 to Mom Account #1212",
    "Bill of ₹999 paid for Airtel Services",
    "Miscellaneous spend of ₹150 at local store",
    "Spent ₹2500 on Zara for clothes",
    "Ola ride charged ₹350 for travel",
    "Pharmacy bill ₹850 paid via UPI",
    "Fees of ₹15000 paid to St. Mary's School",
    "Netflix subscription renewed for ₹499",
    "Uber monthly pass ₹1200",
    "Rent of ₹20000 transferred to Landlord",
    "Salary of ₹75000 credited to your account",
    "Received ₹500 from Rahul",
    "Refund of ₹1200 received from Amazon"
  ];

  const handleManualSync = async () => {
    await syncHistory();
  };

  const handleTestAutoSync = () => {
    const randomSms = testSmsPool[Math.floor(Math.random() * testSmsPool.length)];
    simulateIncomingSMS(randomSms);
  };

  useEffect(() => {
    if (!profile?.familyId && !profile?.role) return;
    const q = query(
      collection(db, 'expenses'),
      where('familyId', '==', profile?.familyId || 'none'),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExpenses(data);
      },
      (error) => {
        if (error.code === 'permission-denied') {
          console.log("Dashboard: Waiting for family approval to sync transactions.");
        } else {
          console.error("Dashboard Expenses Error:", error);
        }
      }
    );
    return () => unsubscribe();
  }, [profile?.familyId]);

  const handleSimulateSMS = async () => {
    if (!smsText.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseSMS(smsText);
      await addDoc(collection(db, 'expenses'), {
        ...parsed,
        userId: user?.uid,
        userName: profile?.name || user?.displayName,
        familyId: profile?.familyId,
        date: new Date().toISOString(),
        rawText: smsText,
        createdAt: serverTimestamp()
      });
      setSmsText('');
      toast.success("Transaction tracked!");
    } catch (error) {
      toast.error("Failed to parse SMS");
    } finally {
      setParsing(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTransactions = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const totalMonthlySpend = monthlyTransactions
    .filter(t => !t.isCredit)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalMonthlyIncome = monthlyTransactions
    .filter(t => t.isCredit)
    .reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals = monthlyTransactions
    .filter(t => !t.isCredit)
    .reduce((acc, exp) => {
      const cat = exp.category || 'Transfers';
      acc[cat] = (acc[cat] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const maxCategory = pieData.length > 0 
    ? pieData.reduce((prev, current) => (prev.value > current.value ? prev : current))
    : null;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailySpending = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayTotal = monthlyTransactions
      .filter(t => !t.isCredit && new Date(t.date).getDate() === day)
      .reduce((s, t) => s + t.amount, 0);
    return { day, amount: dayTotal };
  });

  const maxSpendDay = dailySpending.reduce((prev, current) => (prev.amount > current.amount ? prev : current), dailySpending[0]);

  if (!profile?.familyId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 text-center">
        <Card className="max-w-md w-full rounded-3xl p-6 border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">No Family Group</CardTitle>
            <CardDescription>Setup your family to start tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Link to="/family">
              <Button className="w-full h-12 rounded-xl">Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MobileLayout title="Home">
      <div className="p-4 space-y-6">
        {/* Monthly Summary Hero */}
        <div className="relative overflow-hidden bg-neutral-900 rounded-[2.5rem] p-6 min-[400px]:p-8 text-white shadow-2xl">
           <div className="relative z-10 space-y-4">
             <div className="space-y-1">
               <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Spent this month</p>
               <h2 className="text-3xl min-[370px]:text-4xl min-[400px]:text-5xl font-black tracking-tighter italic break-all">₹{totalMonthlySpend.toLocaleString()}</h2>
             </div>
             
             <div className="flex items-center gap-4 min-[370px]:gap-6">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Income</p>
                  <p className="text-xs min-[370px]:text-sm font-black text-green-400">₹{totalMonthlyIncome.toLocaleString()}</p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-bold flex items-center gap-1 h-fit whitespace-nowrap">
                   <TrendingUp className="w-3 h-3 text-green-400" />
                   On track
                </div>
             </div>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-2">By Category</h3>
          <div className="flex gap-3 overflow-x-auto pb-4 px-2">
             {Object.entries(categoryTotals).map(([cat, total]) => (
               <div key={cat} className="flex-shrink-0 bg-neutral-900 text-white p-4 rounded-[2rem] min-w-[140px] space-y-1 shadow-lg">
                  <p className="text-[8px] uppercase font-bold text-neutral-400">{cat}</p>
                  <p className="text-lg font-black tracking-tight">₹{total.toLocaleString()}</p>
               </div>
             ))}
             {Object.keys(categoryTotals).length === 0 && (
               <div className="text-[10px] font-bold text-neutral-300 italic py-4">No categories yet</div>
             )}
          </div>
        </div>

        {/* Visual Insights */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-2 mt-4 font-sans">Visual Insights</h3>
          <Tabs defaultValue="trend" className="w-full">
            <TabsList className="bg-neutral-100/50 rounded-2xl p-1 mb-4 backdrop-blur-sm">
              <TabsTrigger value="trend" className="rounded-xl text-[10px] uppercase font-bold tracking-widest flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">Spending Trend</TabsTrigger>
              <TabsTrigger value="dist" className="rounded-xl text-[10px] uppercase font-bold tracking-widest flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">Spend Mix</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trend">
               <Card className="rounded-[2.5rem] border-none bg-neutral-50 p-7 h-[300px] flex flex-col shadow-inner">
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailySpending}>
                        <XAxis dataKey="day" hide />
                        <Tooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '900', padding: '12px' }}
                        />
                        <Bar 
                          dataKey="amount" 
                          fill="#141414" 
                          radius={[6, 6, 0, 0]}
                          animationDuration={1500}
                        >
                          {dailySpending.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.amount === maxSpendDay?.amount && entry.amount > 0 ? '#141414' : '#E5E5E5'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="pt-4 flex justify-between items-end border-t border-neutral-200/50 mt-2">
                    <div>
                      <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Highest day</p>
                      <p className="text-xs font-black">Day {maxSpendDay?.day} (₹{maxSpendDay?.amount})</p>
                    </div>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest text-right">Daily trend</p>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="dist">
               <Card className="rounded-[2.5rem] border-none bg-neutral-50 p-6 h-[300px] flex flex-col items-center justify-center relative shadow-inner">
                  <div className="w-full h-full p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '900' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Central Label for Donut */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-4">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-tighter">Total</p>
                    <p className="text-xl font-black text-neutral-900 leading-none">₹{totalMonthlySpend.toLocaleString()}</p>
                  </div>

                  <div className="w-full pt-2 border-t border-neutral-200/50 flex justify-between items-center px-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Major category</span>
                      <span className="text-xs font-black truncate max-w-[150px]">{maxCategory?.name || 'None'}</span>
                    </div>
                    <div className="text-right shrink-0">
                       <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Balance</span>
                       <span className="text-xs font-black block text-green-600">₹{(totalMonthlyIncome - totalMonthlySpend).toLocaleString()}</span>
                    </div>
                  </div>
               </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Smart Capture - Simplified for App */}
        <Card className="rounded-[2.5rem] border-none bg-neutral-900 text-white p-7 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block leading-none">Status</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {isListening ? 'Auto-Monitoring Active' : 'Native Sync Ready'}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={isListening ? "secondary" : "default"} 
                  className={cn(
                    "rounded-full px-4 h-8 text-[10px] font-black uppercase tracking-tighter",
                    isListening ? "bg-white/10 hover:bg-white/20 text-white border-none" : "bg-white text-black"
                  )}
                  onClick={() => setIsListening(!isListening)}
                >
                  {isListening ? 'STOP' : 'ACTIVATE'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  disabled={isSyncing}
                  className="bg-white/10 hover:bg-white/20 text-white border-none rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex flex-col gap-1 items-center justify-center"
                  onClick={handleManualSync}
                >
                  <Wifi className="w-4 h-4 mb-1" />
                  {isSyncing ? 'Syncing...' : 'Log Inbox'}
                </Button>
                <Button 
                  variant="outline" 
                   className="bg-transparent border-white/20 text-white hover:bg-white/5 rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex flex-col gap-1 items-center justify-center"
                  onClick={handleTestAutoSync}
                >
                  <Zap className="w-4 h-4 mb-1" />
                  Test Sync
                </Button>
              </div>

              {!isListening && (
                <div className="bg-white/5 rounded-2xl p-4 flex gap-2">
                  <Input 
                    placeholder="Manual entry..." 
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className="rounded-xl bg-white/10 border-none h-11 text-white placeholder:text-neutral-500"
                  />
                  <Button onClick={handleSimulateSMS} disabled={parsing || !smsText} className="rounded-xl h-11 w-11 bg-white text-black">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl opacity-50" />
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Transactions</h3>
            <Link to="/expenses">
              <Button variant="ghost" size="sm" className="text-xs font-bold text-neutral-900 rounded-full hover:bg-neutral-100">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
             {expenses.map((exp) => (
               <motion.div 
                key={exp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-neutral-100 p-3 min-[370px]:p-4 rounded-3xl flex justify-between items-center shadow-sm gap-2"
               >
                 <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-50 flex items-center justify-center font-serif italic font-black text-neutral-900 border border-neutral-100">
                      {exp.merchant?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs min-[370px]:text-sm font-bold tracking-tight truncate">{exp.merchant}</p>
                      <p className="text-[9px] min-[370px]:text-[10px] text-neutral-400 uppercase font-black truncate">{exp.category} • {exp.userName.split(' ')[0]}</p>
                    </div>
                 </div>
                 <div className="text-right shrink-0">
                    <p className={cn(
                      "text-xs min-[370px]:text-sm font-black tracking-tight",
                      exp.isCredit ? "text-green-600" : "text-neutral-900"
                    )}>
                      {exp.isCredit ? '+' : '-'}₹{exp.amount.toLocaleString()}
                    </p>
                    <p className="text-[8px] min-[370px]:text-[9px] uppercase font-black text-neutral-400 tracking-tighter">
                      {exp.isCredit ? 'Credited' : 'Debited'}
                    </p>
                 </div>
               </motion.div>
             ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

