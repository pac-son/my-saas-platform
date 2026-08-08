import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { merchants, vaults } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";
import MerchantCredentials from "@/components/merchant-credentials";
import Link from "next/link";

export default async function MerchantDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  // 1. Fetch the Merchant
  const merchant = await db.query.merchants.findFirst({
    where: eq(merchants.clerkId, userId),
  });

  // If they aren't a merchant, show a proper registration CTA
  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-full mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Not a Registered Merchant</h2>
          <p className="text-slate-500 mb-6">
            Register your business to get API keys and start offering Save Now, Buy Later to your customers.
          </p>
          <Link
            href="/merchant/register"
            className="inline-block w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
          >
            Register as a Merchant →
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch all SNBL Orders (Vaults) tied to this specific merchant
  const pendingOrders = await db.query.vaults.findMany({
    where: eq(vaults.merchantId, merchant.id),
    orderBy: [desc(vaults.createdAt)],
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold">S</div>
          <span className="font-bold text-slate-900">Merchant Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">{merchant.businessName}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 space-y-8">
        
        {/* API Credentials + Embed Code (client component for interactivity) */}
        <MerchantCredentials
          publishableKey={merchant.publishableKey}
          secretKey={merchant.secretKey}
          webhookUrl={merchant.webhookUrl}
          websiteUrl={merchant.websiteUrl}
        />

        {/* Section 3: Active SNBL Orders */}
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