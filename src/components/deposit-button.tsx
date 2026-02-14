"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositButton({ walletId }: { walletId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          amount: 5000, 
          reference: `DEMO-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 👇 Now we see the REAL error message from the server
        throw new Error(data.error || "Failed to deposit");
      }

      alert("Deposit Successful! 💸");
      router.refresh(); 
      
    } catch (e: any) {
      console.error("Deposit Error:", e);
      // 👇 Shows the specific error (e.g., "Network Error" or "Deposit must be positive")
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDeposit}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? "Processing..." : "Add ₦5,000"}
    </button>
  );
}