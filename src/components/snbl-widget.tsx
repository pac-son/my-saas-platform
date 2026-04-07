"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SNBLWidgetProps {
  merchantKey: string;
  productId: string;
  productName: string;
  price: number; // in Dollars
}

export default function SNBLWidget({ merchantKey, productId, productName, price }: SNBLWidgetProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStartSaving = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/b2b/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishableKey: merchantKey,
          productId,
          productName,
          targetAmount: price,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert(`Success! You started a savings plan for ${productName}.`);
      router.push("/dashboard"); 

    } catch (error: any) {
      // If they aren't logged in, Clerk will throw a 401. 
      // In real production widget, add a Clerk sign-in modal here
      if (error.message.includes("logged in")) {
         alert("Please sign into Student Wallet first!");
      } else {
         alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl max-w-sm mt-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">Save Now, Buy Later</h4>
          <p className="text-xs text-gray-500">Powered by Student Wallet</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-indigo-600">${price.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Lock in price</p>
        </div>
      </div>
      
      <button
        onClick={handleStartSaving}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Initializing..." : `Start Saving for ${productName}`}
      </button>
    </div>
  );
}