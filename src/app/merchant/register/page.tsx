"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CopyButton from "@/components/copy-button";

type Step = "form" | "success";

interface MerchantData {
  id: string;
  businessName: string;
  publishableKey: string;
  secretKey: string;
  websiteUrl: string | null;
  webhookUrl: string | null;
}

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  // Result after successful registration
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/merchant/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          websiteUrl: websiteUrl || undefined,
          webhookUrl: webhookUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Already registered — redirect to dashboard
          router.push("/merchant");
          return;
        }
        throw new Error(data.error || "Registration failed");
      }

      setMerchant(data.merchant);
      setStep("success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const embedSnippet = merchant
    ? `<!-- SaveUp — Save Now, Buy Later Widget -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/saveup.js"></script>
<div
  data-saveup-widget
  data-merchant-key="${merchant.publishableKey}"
  data-product-id="YOUR_PRODUCT_ID"
  data-product-name="YOUR_PRODUCT_NAME"
  data-price="0.00"
></div>`
    : "";

  // ─── STEP 1: Registration Form ───
  if (step === "form") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-xl mb-4">
              <span className="text-2xl text-white font-bold">S</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Register as a Merchant</h1>
            <p className="text-slate-500 mt-2">
              Get your API keys to add Save Now, Buy Later to your store.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Business Name */}
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  minLength={2}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. TechGadgets Store"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  autoFocus
                />
              </div>

              {/* Website URL */}
              <div>
                <label htmlFor="websiteUrl" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Store URL
                </label>
                <input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://your-store.myshopify.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
                <p className="mt-1 text-xs text-slate-400">Your Shopify, WooCommerce, or custom store URL</p>
              </div>

              {/* Webhook URL */}
              <div>
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Webhook URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-store.com/api/saveup-webhook"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
                <p className="mt-1 text-xs text-slate-400">
                  We&apos;ll send a POST request here when a shopper fully funds a product
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !businessName.trim()}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering...
                  </span>
                ) : (
                  "Register & Get API Keys"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Already registered?{" "}
            <a href="/merchant" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Go to Merchant Dashboard →
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Success — Show Keys & Embed Code ───
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">You&apos;re All Set!</h1>
          <p className="text-slate-500 mt-2">
            <strong>{merchant?.businessName}</strong> has been registered. Here are your API credentials.
          </p>
        </div>

        {/* API Keys Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">API Credentials</h2>

          <div className="space-y-4">
            {/* Publishable Key */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Publishable Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-4 py-2.5 rounded-lg text-sm font-mono text-slate-800 border border-slate-200 truncate">
                  {merchant?.publishableKey}
                </code>
                <CopyButton value={merchant?.publishableKey || ""} />
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Secret Key — Keep this private!</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900 px-4 py-2.5 rounded-lg text-sm font-mono text-green-400 border border-slate-800 truncate">
                  {showSecret ? merchant?.secretKey : "sk_test_••••••••••••••••••••••••"}
                </code>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
                >
                  {showSecret ? "Hide" : "Reveal"}
                </button>
                <CopyButton value={merchant?.secretKey || ""} />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>⚠️ Important:</strong> Your secret key is only shown once. Save it somewhere secure. 
              You can always regenerate keys from the merchant dashboard.
            </p>
          </div>
        </div>

        {/* Embed Code Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Embed Code</h2>
            <CopyButton value={embedSnippet} label="Copy Snippet" />
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Paste this into your Shopify theme or any HTML page. Replace the placeholder values with your product details.
          </p>
          <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {embedSnippet}
          </pre>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <a
            href="/merchant"
            className="flex-1 text-center py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
          >
            Go to Merchant Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
