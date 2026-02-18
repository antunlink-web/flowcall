import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const STRIPE_PLANS = {
  basic: {
    price_id: "price_1Sz1DNLWfLL67O2mk1cgI1Ac",
    product_id: "prod_Twv3iElsXnsuew",
    name: "Basic",
    price: 12,
    currency: "€",
  },
  plus: {
    price_id: "price_1Sz1DbLWfLL67O2mdiMU8AyB",
    product_id: "prod_Twv3tVrUfkkvRO",
    name: "Plus",
    price: 18,
    currency: "€",
  },
} as const;

interface SubscriptionContextType {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  plan: "basic" | "plus" | null;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string, quantity?: number) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<"basic" | "plus" | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setSubscribed(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("check-subscription error:", error);
        setLoading(false);
        return;
      }

      const isSub = data?.subscribed || false;
      const pid = data?.product_id || null;
      setSubscribed(isSub);
      setProductId(pid);
      setSubscriptionEnd(data?.subscription_end || null);

      if (pid === STRIPE_PLANS.basic.product_id) setPlan("basic");
      else if (pid === STRIPE_PLANS.plus.product_id) setPlan("plus");
      else setPlan(null);
    } catch (err) {
      console.error("check-subscription failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const createCheckout = useCallback(async (priceId: string, quantity = 1) => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, quantity },
    });
    if (error) throw new Error(error.message);
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  const openCustomerPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw new Error(error.message);
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscribed, productId, subscriptionEnd, loading, plan,
      checkSubscription, createCheckout, openCustomerPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    console.error("[useSubscription] Called outside SubscriptionProvider!");
    // Return safe fallback instead of throwing to prevent silent crash
    return {
      subscribed: false,
      productId: null,
      subscriptionEnd: null,
      loading: false,
      plan: null as "basic" | "plus" | null,
      checkSubscription: async () => {},
      createCheckout: async (_priceId: string, _quantity?: number) => {},
      openCustomerPortal: async () => {},
    };
  }
  return context;
}
