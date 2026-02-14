"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositButton({ walletId }: { walletId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          amount: 5000, // Hardcoded 5000 NGN for demo
          reference: `DEMO-${Date.now()}`,
        }),
      });

      if (res.ok) {
        alert("Deposit Successful!");
        router.refresh(); // ✨ Refreshes the server data instantly
      } else {
        alert("Deposit failed");
      }
    } catch (e) {
      console.error(e);
      alert("Error");
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