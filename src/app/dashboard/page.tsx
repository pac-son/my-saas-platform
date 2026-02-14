import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, wallets, transactions } from "@/db/schema"; // Ensure imports match your schema
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  // 1. Get the real user from Clerk
  const authUser = await currentUser();

  if (!authUser) {
    redirect("/sign-in");
  }

  // 2. Check if this user exists in OUR database
  let dbUser = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  // 3. If they don't exist, create them + a wallet (Lazy Sync)
  if (!dbUser) {
    await db.transaction(async (tx) => {
      // A. Create User
      await tx.insert(users).values({
        id: authUser.id, // Use Clerk's ID (e.g. "user_2b7...")
        email: authUser.emailAddresses[0].emailAddress,
        fullName: `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim(),
      });

      // B. Create Wallet
      await tx.insert(wallets).values({
        userId: authUser.id,
        currency: 'NGN',
        balance: 0,
      });
    });
  }

  // 4. Fetch the Wallet & Transactions
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, authUser.id),
    with: {
      transactions: {
        limit: 5,
        orderBy: [desc(transactions.createdAt)],
      },
    },
  });

  if (!wallet) return <div>Error loading wallet...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Savings</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{authUser.emailAddresses[0].emailAddress}</span>
            {/* Clerk's User Button (Logout, Profile) */}
             <div className="h-8 w-8 bg-gray-200 rounded-full overflow-hidden">
                <img src={authUser.imageUrl} alt="Profile" />
             </div>
          </div>
          {/* Add this inside the header section, just below the email/profile pic */}
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 font-mono">
              Wallet ID: {wallet.id}
            </div>
        </header>

        {/* 💳 Balance Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Balance</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {wallet.currency} {(wallet.balance / 100).toFixed(2)}
            </span>
            <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Live
            </span>
          </div>
        </div>

        {/* 📄 Transaction History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wallet.transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {new Date(txn.createdAt!).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 capitalize">{txn.type}</td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    txn.type === 'deposit' ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {txn.type === 'deposit' ? '+' : '-'} 
                    {(txn.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 capitalize">
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {wallet.transactions.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No transactions yet.
            </div>
          )}
        </div>

      </div>
    </main>
  );
}