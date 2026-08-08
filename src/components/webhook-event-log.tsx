"use client";

interface WebhookEvent {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  createdAt: string | null;
}

interface WebhookEventLogProps {
  events: WebhookEvent[];
}

export default function WebhookEventLog({ events }: WebhookEventLogProps) {
  if (events.length === 0) {
    return (
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Webhook Event Log</h2>
        <p className="text-sm text-slate-500 mb-6">
          Events will appear here once shoppers start funding their savings goals.
        </p>
        <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
          <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          No webhook events yet
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Webhook Event Log</h2>
          <p className="text-sm text-slate-500 mt-1">
            Delivery history for webhooks sent to your endpoint.
          </p>
        </div>
        <span className="text-xs font-medium text-slate-400">
          Showing last {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
            <tr>
              <th className="px-4 py-3 font-medium">Event Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Last Attempt</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                  <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                    {event.eventType}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={event.status} />
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {event.attempts} / 5
                </td>
                <td className="px-4 py-4 text-xs text-slate-500">
                  {event.lastAttemptAt
                    ? new Date(event.lastAttemptAt).toLocaleString()
                    : "—"}
                </td>
                <td className="px-4 py-4 text-xs text-slate-500">
                  {event.createdAt
                    ? new Date(event.createdAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-50 text-green-700 border-green-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    success: "Delivered",
    pending: "Pending",
    failed: "Failed",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
        styles[status] || "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
