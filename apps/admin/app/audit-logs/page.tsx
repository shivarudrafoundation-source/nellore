'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Pagination } from '../components/pagination';
import { Card } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function AuditLogsContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (actionFilter) params.set('action', actionFilter);

        const res = await fetch(`${API}/admin/audit-logs?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load audit logs.');
        const data = await res.json();
        setLogs(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [actionFilter],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">System Audit Logs</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Immutable trace of administrative actions, judge events & security activities
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 bg-[#0A0A0A] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40"
        >
          <option value="">All Action Types</option>
          <option value="ADMIN_LOGIN">Admin Login</option>
          <option value="JUDGE_CREATED">Judge Created</option>
          <option value="JUDGE_ASSIGNED">Judge Assigned</option>
          <option value="JUDGE_PASSWORD_RESET">Judge Password Reset</option>
          <option value="JUDGE_DISABLED">Judge Disabled</option>
          <option value="JUDGE_ENABLED">Judge Enabled</option>
          <option value="EVENT_CREATED">Event Created</option>
          <option value="CATEGORY_CREATED">Category Created</option>
          <option value="ROUND_CREATED">Round Created</option>
          <option value="ROUND_ENDED">Round Ended</option>
          <option value="PAYMENT_VERIFIED">Payment Verified</option>
        </select>
      </div>

      {error && <p className="font-sans text-sm text-red-400">{error}</p>}

      {loading ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6">
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-luxury-gray-border/15 rounded" />
            ))}
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">NO AUDIT LOGS RECORDED</p>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Timestamp', 'Actor', 'Action', 'Entity', 'Entity ID', 'IP Address'].map((h) => (
                    <th
                      key={h}
                      className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors">
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 pl-6 whitespace-nowrap">
                      {new Date(l.createdAt || l.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="font-sans text-xs text-luxury-white/80 py-3 px-4">
                      <span className="font-bold text-luxury-gold">{l.actorType}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold text-luxury-white px-2 py-0.5 bg-luxury-gray-border/10 border border-luxury-gray-border/20">
                        {l.action}
                      </span>
                    </td>
                    <td className="font-sans text-xs text-luxury-white/70 py-3 px-4">{l.entity}</td>
                    <td className="font-mono text-[10px] text-luxury-white/40 py-3 px-4">{l.entityId || '—'}</td>
                    <td className="font-mono text-[10px] text-luxury-white/40 py-3 px-4 pr-6">{l.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(p) => fetchLogs(p)}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <AuditLogsContent />
      </AdminShell>
    </AuthGuard>
  );
}
