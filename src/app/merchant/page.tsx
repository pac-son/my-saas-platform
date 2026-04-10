import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { merchants, vaults, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";

export default async function MerchantDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  // 1. Fetch the Merchant
  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.clerkId, userId),
  });

  // If they aren't a merchant, they shouldn't be here (in a real app, you'd show an onboarding form)
  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
          <h2 className="text-xl font-bold mb-2">Not a Registered Merchant</h2>
          <p className="text-gray-500">You must register your business to access this portal.</p>
        </div>
      </div>
    );
  }

  // 2. Fetch all SNBL Orders (Vaults) tied to this specific merchant
  // Use Drizzle's relation features to pull the shopper's name too
  const pendingOrders = await db.query.vaults.findMany({
    where: eq(vaults.merchantId, merchant.id),
    orderBy: [desc(vaults.createdAt)],
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold">M</div>
          <span className="font-bold text-slate-900">Merchant Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">{merchant.businessName}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 space-y-8">
        
        {/* Section 1: API Credentials */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">API Credentials</h2>
          <p className="text-sm text-slate-500 mb-6">Use these keys to authenticate your e-commerce store with our SNBL infrastructure.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Publishable Key</label>
              <code className="block bg-slate-100 px-4 py-3 rounded-lg text-sm font-mono text-slate-800 border border-slate-200">
                {merchant.publishableKey}
              </code>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Secret Key (Keep Hidden)</label>
              <code className="block bg-slate-900 px-4 py-3 rounded-lg text-sm font-mono text-green-400 border border-slate-800">
                {merchant.secretKey}
              </code>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Webhook URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  disabled
                  value={merchant.webhookUrl || "No webhook configured"} 
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-500"
                />
                <button className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Pending Orders */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Active SNBL Orders</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Order / Product</th>
                  <th className="px-4 py-3 font-medium">Customer ID</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No active orders yet. Embed the widget on your store to start!
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((order) => {
                    const progress = Math.min((order.currentAmount / order.targetAmount) * 100, 100);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">{order.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">{order.productId}</p>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-slate-500">
                          {order.userId.substring(0, 12)}...
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600 w-8">{Math.round(progress)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {order.status === 'completed' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                              Ready to Ship
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                              Funding
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}