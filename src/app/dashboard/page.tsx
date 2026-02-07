import { db } from '@/db';
import { wallets, transactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const MOCK_USER_ID = '09f72c1e-1c6a-4db3-8c5a-42827f7410e7'; 

export default async function Dashboard() {
  // 1. Fetch Wallet & Transactions in Parallel (Fast!)
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, MOCK_USER_ID),
    with: {
      transactions: {
        limit: 5,
        orderBy: [desc(transactions.createdAt)], // Newest first
      },
    },
  });

  if (!wallet) {
    return <div className="p-8 text-red-500">No wallet found. Check the MOCK_USER_ID.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Savings</h1>
          <span className="text-sm text-gray-500">User: {MOCK_USER_ID.slice(0, 8)}...</span>
        </header>

        {/* 💳 Balance Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Balance</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {wallet.currency} {(wallet.balance / 100).toFixed(2)}
            </span>
            <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Active
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
                    {new Date(txn.createdAt).toLocaleDateString()}
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
              No transactions yet. Go make a deposit!
            </div>
          )}
        </div>

      </div>
    </main>
  );
}