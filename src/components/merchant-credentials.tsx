"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CopyButton from "@/components/copy-button";

interface MerchantCredentialsProps {
  publishableKey: string;
  secretKey: string;
  webhookUrl: string | null;
  websiteUrl: string | null;
}

export default function MerchantCredentials({
  publishableKey,
  secretKey,
  webhookUrl: initialWebhookUrl,
  websiteUrl,
}: MerchantCredentialsProps) {
  const router = useRouter();
  const [showSecret, setShowSecret] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl || "");
  const [saving, setSaving] = useState(false);

  const embedSnippet = `<!-- SaveUp — Save Now, Buy Later Widget -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/saveup.js"></script>
<div
  data-saveup-widget
  data-merchant-key="${publishableKey}"
  data-product-id="YOUR_PRODUCT_ID"
  data-product-name="YOUR_PRODUCT_NAME"
  data-price="0.00"
></div>`;

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/merchant/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl || null }),
      });

      if (!res.ok) throw new Error("Failed to update webhook");

      setEditingWebhook(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: API Credentials */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">API Credentials</h2>
        <p className="text-sm text-slate-500 mb-6">
          Use these keys to authenticate your e-commerce store with our SNBL infrastructure.
        </p>

        <div className="space-y-4">
          {/* Publishable Key */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Publishable Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-100 px-4 py-3 rounded-lg text-sm font-mono text-slate-800 border border-slate-200 truncate">
                {publishableKey}
              </code>
              <CopyButton value={publishableKey} />
            </div>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Secret Key (Keep Hidden)
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-900 px-4 py-3 rounded-lg text-sm font-mono text-green-400 border border-slate-800 truncate">
                {showSecret ? secretKey : "sk_test_••••••••••••••••••••••••••••••••"}
              </code>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
              >
                {showSecret ? "Hide" : "Reveal"}
              </button>
              <CopyButton value={secretKey} />
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Webhook URL
            </label>
            {editingWebhook ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-store.com/api/saveup-webhook"
                  className="flex-1 border border-slate-200 px-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveWebhook}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setWebhookUrl(initialWebhookUrl || "");
                    setEditingWebhook(false);
                  }}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-500">
                  {initialWebhookUrl || "No webhook configured"}
                </div>
                <button
                  onClick={() => setEditingWebhook(true)}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Website URL (read-only) */}
          {websiteUrl && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Store URL
              </label>
              <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600">
                {websiteUrl}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Embed Code */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Embed Code</h2>
            <p className="text-sm text-slate-500 mt-1">
              Paste this into your Shopify theme or any HTML page to enable Save Now, Buy Later.
            </p>
          </div>
          <CopyButton value={embedSnippet} label="Copy Snippet" />
        </div>
        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {embedSnippet}
        </pre>
        <p className="mt-3 text-xs text-slate-400">
          Replace <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">YOUR_PRODUCT_ID</code>,{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">YOUR_PRODUCT_NAME</code>, and{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">0.00</code> with your actual product details.
        </p>
      </section>
    </div>
  );
}
