import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Clock, CheckCircle, AlertTriangle, Eye,
  MoreHorizontal, X, Loader2, ExternalLink, Shield
} from 'lucide-react';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  club_name: string | null;
  is_demo: boolean;
  created_at: string;
  license?: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    trial_start: string | null;
    trial_end: string | null;
    cancel_at_period_end: boolean;
    plan: { name: string; price_nok: number; billing_interval: string } | null;
  } | null;
  stripe_customer?: { stripe_customer_id: string } | null;
}

interface BillingEvent {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface Stats {
  total: number;
  trialing: number;
  active: number;
  demo: number;
  expiringSoon: number;
  pastDue: number;
}

export function AdminLicenses() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, trialing: 0, active: 0, demo: 0, expiringSoon: 0, pastDue: 0 });
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, club_name, is_demo, created_at')
      .order('created_at', { ascending: false });

    if (!profiles) {
      setLoading(false);
      return;
    }

    const { data: licenses } = await supabase
      .from('licenses')
      .select('id, user_id, status, current_period_start, current_period_end, trial_start, trial_end, cancel_at_period_end, plan:plans(name, price_nok, billing_interval)');

    const { data: stripeCustomers } = await supabase
      .from('stripe_customers')
      .select('user_id, stripe_customer_id');

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let trialing = 0, active = 0, demo = 0, expiringSoon = 0, pastDue = 0;

    const userRows: UserRow[] = profiles.map((p) => {
      const lic = licenses?.find((l: any) => l.user_id === p.id);
      const sc = stripeCustomers?.find((s: any) => s.user_id === p.id);

      if (p.is_demo) demo++;
      if (lic) {
        if (lic.status === 'trialing') trialing++;
        if (lic.status === 'active') active++;
        if (lic.status === 'past_due') pastDue++;
        if ((lic.status === 'trialing' || lic.status === 'active') && new Date(lic.current_period_end) <= thirtyDaysFromNow) {
          expiringSoon++;
        }
      }

      return {
        ...p,
        license: lic ? { ...lic, plan: Array.isArray(lic.plan) ? lic.plan[0] : lic.plan } : null,
        stripe_customer: sc || null,
      };
    });

    setUsers(userRows);
    setStats({ total: profiles.length, trialing, active, demo, expiringSoon, pastDue });
    setLoading(false);
  };

  const openDetail = async (user: UserRow) => {
    setSelectedUser(user);
    setDetailLoading(true);

    const { data } = await supabase
      .from('billing_events')
      .select('id, event_type, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setBillingEvents(data || []);
    setDetailLoading(false);
  };

  const toggleDemo = async (userId: string, setDemo: boolean) => {
    setActionLoading(true);
    setMenuOpen(null);

    await supabase
      .from('profiles')
      .update({ is_demo: setDemo })
      .eq('id', userId);

    await fetchUsers();
    setActionLoading(false);
  };

  const getStatusBadge = (user: UserRow) => {
    if (user.is_demo) return { label: 'Demo', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
    if (!user.license) return { label: 'Ingen', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' };
    const s = user.license.status;
    if (s === 'trialing') return { label: 'Trial', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
    if (s === 'active') return { label: 'Aktiv', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
    if (s === 'past_due') return { label: 'Past Due', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    if (s === 'canceled') return { label: 'Kansellert', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' };
    return { label: 'Utlopt', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Brukere totalt" value={stats.total} icon={Users} color="slate" />
        <StatCard label="Proveperiode" value={stats.trialing} icon={Clock} color="blue" />
        <StatCard label="Aktive abonnement" value={stats.active} icon={CheckCircle} color="emerald" />
        <StatCard label="Demo-brukere" value={stats.demo} icon={Shield} color="purple" />
        <StatCard label="Utloper 30d" value={stats.expiringSoon} icon={AlertTriangle} color="amber" />
        <StatCard label="Past Due" value={stats.pastDue} icon={AlertTriangle} color="red" />
      </div>

      {/* User Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Navn</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">E-post</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Klubb</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Aktiv til</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden xl:table-cell">Stripe</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = getStatusBadge(u);
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-25 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(u)} className="text-left hover:text-emerald-600 transition-colors font-medium text-slate-900">
                        {u.full_name || 'Ukjent'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{u.club_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${badge.border} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {u.license?.plan?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {u.license ? formatDate(u.license.current_period_end) : '-'}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {u.stripe_customer ? (
                        <span className="text-xs text-slate-500 font-mono">{u.stripe_customer.stripe_customer_id.slice(0, 14)}...</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                        className="p-1 rounded hover:bg-slate-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                      {menuOpen === u.id && (
                        <div className="absolute right-4 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[180px]">
                          <button
                            onClick={() => openDetail(u)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" /> Vis detaljer
                          </button>
                          {u.is_demo ? (
                            <button
                              onClick={() => toggleDemo(u.id, false)}
                              disabled={actionLoading}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-amber-700"
                            >
                              <Shield className="w-3.5 h-3.5" /> Fjern demo
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleDemo(u.id, true)}
                              disabled={actionLoading}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Shield className="w-3.5 h-3.5" /> Sett som demo
                            </button>
                          )}
                          {u.stripe_customer && (
                            <a
                              href={`https://dashboard.stripe.com/test/customers/${u.stripe_customer.stripe_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              onClick={() => setMenuOpen(null)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Stripe Customer
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Brukerdetaljer</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Basic Info */}
              <div className="space-y-2">
                <DetailRow label="Navn" value={selectedUser.full_name || '-'} />
                <DetailRow label="E-post" value={selectedUser.email || '-'} />
                <DetailRow label="Klubb" value={selectedUser.club_name || '-'} />
                <DetailRow label="Registrert" value={formatDate(selectedUser.created_at)} />
                <DetailRow label="Demo" value={selectedUser.is_demo ? 'Ja' : 'Nei'} />
              </div>

              {/* License Info */}
              {selectedUser.license && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Lisens</h4>
                  <div className="space-y-2">
                    <DetailRow label="Plan" value={selectedUser.license.plan?.name || '-'} />
                    <DetailRow label="Status" value={selectedUser.license.status} />
                    <DetailRow label="Trial start" value={formatDate(selectedUser.license.trial_start)} />
                    <DetailRow label="Trial slutt" value={formatDate(selectedUser.license.trial_end)} />
                    <DetailRow label="Aktiv til" value={formatDate(selectedUser.license.current_period_end)} />
                    <DetailRow label="Kanseller ved periodeslutt" value={selectedUser.license.cancel_at_period_end ? 'Ja' : 'Nei'} />
                  </div>
                </div>
              )}

              {/* Stripe Info */}
              {selectedUser.stripe_customer && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Stripe</h4>
                  <DetailRow label="Customer ID" value={selectedUser.stripe_customer.stripe_customer_id} mono />
                </div>
              )}

              {/* Billing Events */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Hendelser</h4>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Laster...
                  </div>
                ) : billingEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">Ingen hendelser registrert.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {billingEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50">
                        <span className="text-xs font-medium text-slate-700">{eventLabel(ev.event_type)}</span>
                        <span className="text-xs text-slate-500">{formatDate(ev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    slate: { bg: 'bg-slate-50', icon: 'text-slate-500', text: 'text-slate-900' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', text: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-900' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', text: 'text-purple-900' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', text: 'text-amber-900' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', text: 'text-red-900' },
  };
  const c = colors[color] || colors.slate;

  return (
    <div className={`${c.bg} border border-slate-100 rounded-xl p-3 sm:p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className="text-xs font-medium text-slate-500 truncate">{label}</span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${c.text}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    trial_started: 'Trial startet',
    checkout_completed: 'Checkout fullfort',
    invoice_paid: 'Faktura betalt',
    subscription_updated: 'Abonnement oppdatert',
    subscription_canceled: 'Abonnement kansellert',
    payment_failed: 'Betaling feilet',
  };
  return labels[type] || type;
}
