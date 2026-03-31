"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateVaultModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create vault");

      alert(`Success! Created vault: ${name}`);
      setName("");
      setTargetAmount("");
      setIsOpen(false);
      router.refresh(); 
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-gray-600 font-medium py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <span>+</span> Create New Savings Goal
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Savings Goal</h2>
            
            <form onSubmit={handleCreateVault} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What are you saving for?
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MacBook Pro, Spring Break"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount (₦)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="0.01"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name || !targetAmount}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}