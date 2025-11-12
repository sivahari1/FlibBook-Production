'use client';

import { useEffect, useState } from 'react';
import AnalyticsChart from '@/components/dashboard/AnalyticsChart';
import { Card } from '@/components/ui/Card';

interface ViewRecord {
  id: string;
  viewerEmail: string | null;
  ipAddress: string;
  userAgent: string;
  country: string | null;
  city: string | null;
  viewedAt: string;
  shareKey: string | null;
}

interface TimelineData {
  date: string;
  count: number;
}

interface AnalyticsData {
  totalViews: number;
  uniqueViewers: number;
  timeline: TimelineData[];
  views: ViewRecord[];
}

export default function AnalyticsClient({ documentId }: { documentId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics/${documentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Views</h3>
            <p className="text-4xl font-bold text-blue-600">{analytics.totalViews}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Unique Viewers</h3>
            <p className="text-4xl font-bold text-green-600">{analytics.uniqueViewers}</p>
          </div>
        </Card>
      </div>

      {/* Timeline Chart */}
      {analytics.timeline.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">View Timeline</h3>
            <AnalyticsChart data={analytics.timeline} />
          </div>
        </Card>
      )}

      {/* Viewer Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Viewer Details</h3>
          
          {analytics.views.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No views yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Viewer Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.views.map((view) => (
                    <tr key={view.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {view.viewerEmail || <span className="text-gray-400 italic">Anonymous</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(view.viewedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {view.city && view.country
                          ? `${view.city}, ${view.country}`
                          : view.country || <span className="text-gray-400 italic">Unknown</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">
                        {view.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
