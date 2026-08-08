import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { merchants, vaults, users, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

interface SavePageProps {
  searchParams: Promise<{
    merchant?: string;
    product?: string;
    name?: string;
    price?: string;
  }>;
}

export default async function SavePage({ searchParams }: SavePageProps) {
  const params = await searchParams;
  const merchantKey = params.merchant || "";
  const productId = params.product || "";
  const productName = params.name || "Unknown Product";
  const priceStr = params.price || "0";
  const price = parseFloat(priceStr);

  // Validate the merchant key
  let merchant = null;
  if (merchantKey) {
    merchant = await db.query.merchants.findFirst({
      where: eq(merchants.publishableKey, merchantKey),
    });
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Link</h2>
          <p className="text-slate-500">
            This savings link is invalid or the merchant is no longer registered.
          </p>
        </div>
      </div>
    );
  }

  // Check if the user is authenticated
  const { userId } = await auth();

  // If authenticated, attempt to create the vault and redirect
  if (userId) {
    // Ensure user exists in our DB (lazy sync, same as dashboard)
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!dbUser) {
      // Import currentUser to get email info
      const { currentUser } = await import("@clerk/nextjs/server");
      const authUser = await currentUser();

      if (authUser) {
        await db.transaction(async (tx) => {
          await tx.insert(users).values({
            id: authUser.id,
            email: authUser.emailAddresses[0].emailAddress,
            fullName: `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim(),
          });
          await tx.insert(wallets).values({
            userId: authUser.id,
            currency: "NGN",
            balance: 0,
          });
        });
      }
    }

    // Check if user already has an active vault for this exact product + merchant
    const existingVault = await db.query.vaults.findFirst({
      where: eq(vaults.userId, userId),
      // We'll check productId + merchantId manually since Drizzle doesn't chain `and` in findFirst easily
    });

    const alreadyHasVault = existingVault &&
      existingVault.merchantId === merchant.id &&
      existingVault.productId === productId &&
      existingVault.status === "active";

    if (!alreadyHasVault && price > 0) {
      const targetInCents = Math.round(price * 100);

      await db.insert(vaults).values({
        userId,
        merchantId: merchant.id,
        productId,
        name: `Saving for: ${productName}`,
        targetAmount: targetInCents,
        currentAmount: 0,
        status: "active",
      });
    }

    redirect("/dashboard");
  }

  // If NOT authenticated, show the product info + sign-in prompt
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Save Now, Buy Later</h1>
          <p className="text-sm text-slate-500 mt-1">
            Powered by SaveUp &middot; via <strong>{merchant.businessName}</strong>
          </p>
        </div>

        {/* Product Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{productName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">{productId}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">${price.toFixed(2)}</p>
              <p className="text-xs text-slate-400">Target price</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-5">
            <p className="text-sm text-indigo-800">
              Sign in to start saving toward this product. You can fund your savings at your own pace.
            </p>
          </div>

          <SignedOut>
            <SignInButton
              mode="modal"
              forceRedirectUrl={`/save?merchant=${encodeURIComponent(merchantKey)}&product=${encodeURIComponent(productId)}&name=${encodeURIComponent(productName)}&price=${encodeURIComponent(priceStr)}`}
            >
              <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                Sign In &amp; Start Saving
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link
              href={`/save?merchant=${encodeURIComponent(merchantKey)}&product=${encodeURIComponent(productId)}&name=${encodeURIComponent(productName)}&price=${encodeURIComponent(priceStr)}`}
              className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Create Savings Goal →
            </Link>
          </SignedIn>
        </div>

        <p className="text-center text-xs text-slate-400">
          SaveUp lets you save toward products at your own pace.<br />
          No interest. No credit checks. Just savings.
        </p>
      </div>
    </div>
  );
}
