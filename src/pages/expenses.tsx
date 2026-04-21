import { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/use-auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Download, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';

import { MobileLayout } from '@/src/components/mobile-layout';

export default function ExpensesPage() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.familyId) return;

    const q = query(
      collection(db, 'expenses'),
      where('familyId', '==', profile.familyId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Expenses Listener Error:", error);
        }
      }
    );

    const mQ = query(
      collection(db, 'users'),
      where('familyId', '==', profile.familyId)
    );
    
    const unsubscribeMembers = onSnapshot(mQ, 
      (snapshot) => {
        setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Members Listener Error:", error);
        }
      }
    );

    return () => {
      unsubscribe();
      unsubscribeMembers();
    };
  }, [profile?.familyId]);

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.merchant?.toLowerCase().includes(filter.toLowerCase()) ||
      exp.category?.toLowerCase().includes(filter.toLowerCase()) ||
      exp.userName?.toLowerCase().includes(filter.toLowerCase());
    
    const matchesMember = selectedMemberId ? exp.userId === selectedMemberId : true;

    return matchesSearch && matchesMember;
  });

  return (
    <MobileLayout title="Expenses">
      <div className="p-4 space-y-6">
        <div className="sticky top-0 bg-white -mx-4 px-4 pt-4 pb-4 z-10 space-y-4 border-b border-neutral-50 shadow-sm shadow-neutral-100/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Search transactions..." 
              className="pl-10 rounded-2xl bg-neutral-50 border-none h-12 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            <Button
              variant={selectedMemberId === null ? "default" : "secondary"}
              size="sm"
              className="rounded-full h-8 text-[10px] font-bold uppercase tracking-widest px-4"
              onClick={() => setSelectedMemberId(null)}
            >
              All
            </Button>
            {members.map((member) => (
              <Button
                key={member.id}
                variant={selectedMemberId === member.id ? "default" : "secondary"}
                size="sm"
                className="rounded-full h-8 text-[10px] font-bold uppercase tracking-widest px-4 whitespace-nowrap"
                onClick={() => setSelectedMemberId(member.id)}
              >
                {member.name || 'User'}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pb-12">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between p-3 min-[370px]:p-4 bg-white border border-neutral-100 rounded-[2rem] shadow-sm gap-2">
              <div className="flex items-center gap-3 min-[370px]:gap-4 min-w-0">
                <div className="w-10 h-10 min-[370px]:w-12 min-[370px]:h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white font-serif italic text-lg min-[370px]:text-xl shrink-0">
                  {exp.merchant?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm tracking-tight truncate">{exp.merchant}</p>
                  <p className="text-[9px] min-[370px]:text-[10px] text-neutral-400 uppercase font-black tracking-widest truncate">{exp.category} • {format(new Date(exp.date), 'dd MMM')}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={cn(
                  "font-black text-sm min-[370px]:text-base tracking-tighter",
                  exp.isCredit ? "text-green-600" : "text-neutral-900"
                )}>
                  {exp.isCredit ? '+' : '-'}₹{exp.amount.toLocaleString()}
                </p>
                <div className="flex flex-col items-end">
                  <p className="text-[8px] min-[370px]:text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{exp.isCredit ? 'Received' : 'Paid'}</p>
                  <p className="text-[9px] min-[370px]:text-[10px] text-neutral-400 font-bold uppercase truncate max-w-[60px]">{exp.userName?.split(' ')[0]}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredExpenses.length === 0 && (
            <div className="text-center py-20 text-neutral-300">
               <Receipt className="w-12 h-12 mx-auto mb-4 opacity-10" />
               <p className="text-sm font-bold uppercase tracking-widest">No spending found</p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
