'use client';

import React, { useEffect, useState } from 'react';
import { AuthGuard } from './components/auth-guard';
import { AdminShell } from './components/admin-shell';
import { Card, getApiBaseUrl } from '@srf/ui';

interface DashboardStats {
  counts: {
    activeEvents: number;
    upcomingEvents: number;
    totalRegistrations: number;
    paidRegistrations: number;
    contestants: number;
    judges: number;
  };
  recentRegistrations: Array<{
    id: string;
    baseFields: any;
    paymentStatus: string;
    createdAt: string;
    event: { name: string };
    category: { name: string };
  }>;
  recentAuditLogs: Array<{
    id: string;
    actorType: string;
    action: string;
    entity: string;
    entityId: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    name: string;
    code: string;
    location: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card hoverEffect={false} className="border border-luxury-gray-border/20 bg-[#0A0A0A] p-5 text-center space-y-2">
      <span className="font-sans text-[10px] tracking-[0.2em] text-luxury-gold uppercase block font-bold">
        {label}
      </span>
      <span className="font-serif text-3xl font-light text-luxury-white">
        {value}
      </span>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#0A0A0A] border border-luxury-gray-border/20 p-5 text-center space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-luxury-gray-border/20 mx-auto rounded" />
      <div className="h-8 w-16 bg-luxury-gray-border/20 mx-auto rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 py-3 animate-pulse">
      <div className="h-3 w-1/4 bg-luxury-gray-border/20 rounded" />
      <div className="h-3 w-1/3 bg-luxury-gray-border/20 rounded" />
      <div className="h-3 w-1/5 bg-luxury-gray-border/20 rounded" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center border border-dashed border-luxury-gray-border/20">
      <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
        {message}
      </span>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/admin/dashboard/stats`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Unable to load dashboard data. Please try again.');
        }

        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-sans text-sm text-red-400 tracking-wide">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : stats ? (
          <>
            <StatCard label="Active Events" value={stats.counts.activeEvents} />
            <StatCard label="Upcoming Events" value={stats.counts.upcomingEvents} />
            <StatCard label="Total Registrations" value={stats.counts.totalRegistrations} />
            <StatCard label="Paid Registrations" value={stats.counts.paidRegistrations} />
            <StatCard label="Contestants" value={stats.counts.contestants} />
            <StatCard label="Judges" value={stats.counts.judges} />
          </>
        ) : null}
      </div>

      {/* Bottom Sections: 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Registrations */}
        <Card hoverEffect={false} className="border border-luxury-gray-border/20 bg-[#0A0A0A] p-6 space-y-4">
          <h3 className="font-sans text-[10px] tracking-[0.2em] text-luxury-gold uppercase font-bold">
            Recent Registrations
          </h3>
          {loading ? (
            <div className="space-y-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : stats && stats.recentRegistrations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-luxury-gray-border/10">
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Name</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Event</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Category</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRegistrations.map((reg) => {
                    const name = (reg.baseFields as any)?.name || 'N/A';
                    return (
                      <tr key={reg.id} className="border-b border-luxury-gray-border/5">
                        <td className="font-sans text-xs text-luxury-white/70 py-2.5 pr-4">{name}</td>
                        <td className="font-sans text-xs text-luxury-white/50 py-2.5 pr-4">{reg.event.name}</td>
                        <td className="font-sans text-xs text-luxury-white/50 py-2.5 pr-4">{reg.category.name}</td>
                        <td className="py-2.5">
                          <span className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                            reg.paymentStatus === 'PAID' ? 'text-green-400' : 'text-luxury-white/30'
                          }`}>
                            {reg.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No registrations yet" />
          )}
        </Card>

        {/* Recent Audit Logs */}
        <Card hoverEffect={false} className="border border-luxury-gray-border/20 bg-[#0A0A0A] p-6 space-y-4">
          <h3 className="font-sans text-[10px] tracking-[0.2em] text-luxury-gold uppercase font-bold">
            Recent Audit Activity
          </h3>
          {loading ? (
            <div className="space-y-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : stats && stats.recentAuditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-luxury-gray-border/10">
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Time</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Actor</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Action</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAuditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-luxury-gray-border/5">
                      <td className="font-sans text-[11px] text-luxury-white/40 py-2.5 pr-4 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                      <td className="font-sans text-[11px] text-luxury-white/50 py-2.5 pr-4">{log.actorType}</td>
                      <td className="font-sans text-[11px] text-luxury-gold/70 py-2.5 pr-4">{log.action}</td>
                      <td className="font-sans text-[11px] text-luxury-white/40 py-2.5">{log.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No audit activity yet" />
          )}
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card hoverEffect={false} className="border border-luxury-gray-border/20 bg-[#0A0A0A] p-6 space-y-4">
        <h3 className="font-sans text-[10px] tracking-[0.2em] text-luxury-gold uppercase font-bold">
          Upcoming Events
        </h3>
        {loading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : stats && stats.upcomingEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Name</th>
                  <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Code</th>
                  <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Location</th>
                  <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Start</th>
                  <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2">End</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcomingEvents.map((evt) => (
                  <tr key={evt.id} className="border-b border-luxury-gray-border/5">
                    <td className="font-sans text-xs text-luxury-white/70 py-2.5 pr-4">{evt.name}</td>
                    <td className="font-sans text-[11px] text-luxury-gold/60 py-2.5 pr-4">{evt.code}</td>
                    <td className="font-sans text-xs text-luxury-white/50 py-2.5 pr-4">{evt.location}</td>
                    <td className="font-sans text-[11px] text-luxury-white/40 py-2.5 pr-4 whitespace-nowrap">{formatDate(evt.startDate)}</td>
                    <td className="font-sans text-[11px] text-luxury-white/40 py-2.5 whitespace-nowrap">{formatDate(evt.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No upcoming events yet -- Create your first event to get started" />
        )}
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard>
      <AdminShell>
        <DashboardContent />
      </AdminShell>
    </AuthGuard>
  );
}
