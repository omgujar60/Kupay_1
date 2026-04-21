import { useEffect, useState } from 'react';
import { useAuth } from '@/src/hooks/use-auth';
import { parseSMS } from '@/src/services/gemini';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';

/**
 * ARCHITECTURE FOR MOBILE CONVERSION:
 * 
 * When this web app is wrapped in Capacitor (or Cordova), 
 * we use the 'sms-receive' plugin to listen for incoming messages.
 * 
 * For web-browsers, we provide a "Listener Mode" simulation.
 */

/**
 * NATIVE MOBILE INTEGRATION ARCHITECTURE:
 * 
 * When converting this to a mobile app (Capacitor/Cordova):
 * 1. Install 'cordova-plugin-sms-receive' or 'capacitor-community/sms-retriever'
 * 2. In native code, the plugin will emit "smsReceive" events to the window.
 * 3. This hook listens for those events and triggers the AI parsing pipeline.
 */

export function useSMSListener() {
  const { user, profile } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // Request native permissions (Simulation for Web, Hook for Mobile)
  const requestPermission = async () => {
    // In native: await SMSReceiver.requestPermission();
    setHasPermission(true);
    setIsListening(true);
    toast.success("SMS Monitoring Enabled", {
      description: "Kupay is now watching for transaction alerts."
    });
  };

  /**
   * INBOX HISTORY SYNC:
   * When converting to mobile, this function calls the native bridge to 
   * loop through the device's SMS inbox history and extract transaction data.
   */
  const syncHistory = async () => {
    if (!user || !profile?.familyId) return;
    setIsSyncing(true);
    
    toast.info("Accessing SMS Inbox", {
      description: "Reading transaction history from your device..."
    });

    // Native Bridge Simulation for Web
    // In actual Mobile App: const history = await SMSReceiver.listSMS({ box: 'inbox', maxCount: 50 });
    
    // For now, we simulate the "Bridge Success" after a short delay
    setTimeout(async () => {
      // In a real app, 'history' would be the array of SMS strings from the device
      setIsSyncing(false);
      toast.success("History Synced", {
        description: "New transactions found and added to your family circle."
      });
    }, 2000);
  };

  const processIncomingSMS = async (text: string) => {
    // 1. Identity Guard: Only process if authenticated and in a family
    if (!user || !profile?.familyId || !isListening) return;

    // 2. High-level Filter: Quick regex to ignore non-financial texts before AI call
    // looking for keywords like: Rs., INR, Spent, Debited, Account, Bank, Sent, Paid, UPI, VPA
    const financialKeywords = /rs\.?|inr|₹|spent|debited|threshold|transaction|bank|credited|sent|paid|upi|vpa/i;
    if (!financialKeywords.test(text)) {
      console.log("SMS Listener: Non-financial message ignored.");
      return;
    }

    try {
      setLastMessage(text);
      
      // 3. AI Extraction: Leverage Gemini to turn raw text into structured JSON
      const parsed = await parseSMS(text);
      
      // 4. Persistence: Real-time save to Firestore for family-wide sync
      await addDoc(collection(db, 'expenses'), {
        ...parsed,
        userId: user.uid,
        userName: profile.name,
        familyId: profile.familyId,
        date: new Date().toISOString(),
        rawText: text,
        createdAt: serverTimestamp(),
        source: 'native-background-sync' 
      });

      // 5. User Feedback: Push notification simulation
      toast.success(`Captured ₹${parsed.amount}`, {
        description: `Auto-logged from ${parsed.merchant}`
      });
    } catch (error) {
      console.error("Kupay Auto-Sync Error:", error);
    }
  };

  useEffect(() => {
    /**
     * NATIVE EVENT SUBSCRIPTION
     * When the mobile app is in the background or foreground, 
     * the native plugin kicks off this event.
     */
    const handleNativeSMS = (event: any) => {
      const messageBody = event.detail?.body || event.body;
      if (messageBody) {
        processIncomingSMS(messageBody);
      }
    };

    if (isListening) {
      // Listen for the custom event emitted by the native bridge
      window.addEventListener('smsReceive', handleNativeSMS);
      // Also support the common 'onSMSReceive' pattern
      window.addEventListener('onSMSReceive', handleNativeSMS);
    }

    return () => {
      window.removeEventListener('smsReceive', handleNativeSMS);
      window.removeEventListener('onSMSReceive', handleNativeSMS);
    };
  }, [isListening, user, profile]);

  return {
    isListening,
    setIsListening,
    isSyncing,
    syncHistory,
    hasPermission,
    requestPermission,
    lastMessage,
    // simulation helper for web demo
    simulateIncomingSMS: processIncomingSMS
  };
}
