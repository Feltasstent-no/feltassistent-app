import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Clock, CheckCircle, AlertTriangle, Eye,
  MoreHorizontal, X, Loader2, ExternalLink, Shield,
  ShieldOff, UserX, Trash2, RotateCcw, Search
} from 'lucide-react';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  club_name: string | null;
  is_demo: boolean;
  is_disabled: boolean;
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

interface AuditEvent {
  id: string;
  action: string;
  admin_user_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_profile?: { full_name: string | null; email: string | null } | null;
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
  disabled: number;
  expiringSoon: number;
  pastDue: number;
}

type ConfirmAction = 'disable' | 'delete_step1' | 'delete_step2' | null;
type FilterType = 'all' | 'active' | 'trialing' | 'demo' | 'past_due' | 'none' | 'disabled';

export function AdminLicenses() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, trialing: 0, active: 0, demo: 0, disabled: 0, expiringSoon: 0, pastDue: 0 });
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTarget, setConfirmTarget] = useState<UserRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.club_name?.toLowerCase().includes(q))
      );
    }
    if (filter !== 'all') {
      result = result.filter(u => {
        if (filter === 'active') return u.license?.status === 'active' && !u.is_disabled;
        if (filter === 'trialing') return u.license?.status === 'trialing';
        if (filter === 'demo') return u.is_demo;
        if (filter === 'past_due') return u.license?.status === 'past_due';
        if (filter === 'disabled') return u.is_disabled;
        if (filter === 'none') return !u.license && !u.is_demo && !u.is_disabled;
        return true;
      });
    }
    return result;
  }, [users, searchQuery, filter]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, club_name, is_demo, is_disabled, created_at')
      .order('created_at', { ascending: false });

    if (!profiles) { setLoading(false); return; }

    const { data: licenses } = await supabase
      .from('licenses')
      .select('id, user_id, status, current_period_start, current_period_end, trial_start, trial_end, cancel_at_period_end, plan:plans(name, price_nok, billing_interval)');

    const { data: stripeCustomers } = await supabase
      .from('stripe_customers')
      .select('user_id, stripe_customer_id');

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let trialing = 0, active = 0, demo = 0, disabled = 0, expiringSoon = 0, pastDue = 0;

    const userRows: UserRow[] = profiles.map((p) => {
      const lic = licenses?.find((l: any) => l.user_id === p.id);
      const sc = stripeCustomers?.find((s: any) => s.user_id === p.id);
      if (p.is_demo) demo++;
      if (p.is_disabled) disabled++;
      if (lic) {
        if (lic.status === 'trialing') trialing++;
        if (lic.status === 'active') active++;
        if (lic.status === 'past_due') pastDue++;
        if ((lic.status === 'trialing' || lic.status === 'active') && new Date(lic.current_period_end) <= thirtyDaysFromNow) expiringSoon++;
      }
      return { ...p, license: lic ? { ...lic, plan: Array.isArray(lic.plan) ? lic.plan[0] : lic.plan } : null, stripe_customer: sc || null };
    });

    setUsers(userRows);
    setStats({ total: profiles.length, trialing, active, demo, disabled, expiringSoon, pastDue });
    setLoading(false);
  };

  const openDetail = async (u: UserRow) => {
    setSelectedUser(u);
    setMenuOpen(null);
    setDetailLoading(true);
    const [billingRes, auditRes] = await Promise.all([
      supabase.from('billing_events').select('id, event_type, created_at, metadata').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('admin_audit_logs').select('id, action, admin_user_id, details, created_at').eq('target_user_id', u.id).order('created_at', { ascending: false }).limit(20),
    ]);
    setBillingEvents(billingRes.data || []);
    const rawAudit = auditRes.data || [];
    if (rawAudit.length > 0) {
      const adminIds = [...new Set(rawAudit.map(a => a.admin_user_id))];
      const { data: adminProfiles } = await supabase.from('profiles').select('id, full_name, email').in('id', adminIds);
      setAuditEvents(rawAudit.map(a => ({ ...a, admin_profile: adminProfiles?.find(p => p.id === a.admin_user_id) || null })));
    } else {
      setAuditEvents([]);
    }
    setDetailLoading(false);
  };

  const toggleDemo = async (userId: string, setDemo: boolean) => {
    setActionLoading(true);
    setMenuOpen(null);
    await supabase.from('profiles').update({ is_demo: setDemo }).eq('id', userId);
    await logAudit(userId, setDemo ? 'set_demo' : 'remove_demo');
    await fetchUsers();
    setActionLoading(false);
  };

  const handleDisable = async () => {
    if (!confirmTarget || !user) return;
    setActionLoading(true);
    await supabase.from('profiles').update({ is_disabled: true, disabled_at: new Date().toISOString(), disabled_by: user.id }).eq('id', confirmTarget.id);
    await logAudit(confirmTarget.id, 'user_disabled');
    setConfirmAction(null);
    setConfirmTarget(null);
    setToast('Bruker deaktivert');
    await fetchUsers();
    setActionLoading(false);
  };

  const handleReactivate = async (targetId: string) => {
    setActionLoading(true);
    setMenuOpen(null);
    await supabase.from('profiles').update({ is_disabled: false, disabled_at: null, disabled_by: null }).eq('id', targetId);
    await logAudit(targetId, 'user_reactivated');
    setToast('Bruker reaktivert');
    await fetchUsers();
    setActionLoading(false);
  };

  const handleDeleteStep1 = (u: UserRow) => {
    setMenuOpen(null);
    setConfirmTarget(u);
    setConfirmAction('delete_step1');
  };

  const handleDeleteStep2 = () => {
    setConfirmAction('delete_step2');
    setDeleteConfirmText('');
  };

  const expectedDeleteText = confirmTarget?.email ? `SLETT ${confirmTarget.email}` : '';

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget || !user || deleteConfirmText !== expectedDeleteText) return;
    setActionLoading(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) { setActionLoading(false); setToast('Feil: Ingen aktiv sesjon'); return; }
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'Apikey': anonKey },
        body: JSON.stringify({ target_user_id: confirmTarget.id, confirm_text: expectedDeleteText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ukjent feil' }));
        setToast(`Feil: ${err.error || 'Sletting feilet'}`);
      } else {
        setToast('Bruker slettet permanent');
        setSelectedUser(null);
      }
    } catch { setToast('Nettverksfeil ved sletting'); }
    setConfirmAction(null);
    setConfirmTarget(null);
    setDeleteConfirmText('');
    await fetchUsers();
    setActionLoading(false);
  };

  const logAudit = async (targetId: string, action: string, details?: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('admin_audit_logs').insert({ admin_user_id: user.id, target_user_id: targetId, action, details: details || null });
  };

  const isSelf = (userId: string) => user?.id === userId;

  const getStatusBadge = (u: UserRow) => {
    if (u.is_disabled) return { label: 'Deaktivert', cls: 'badge-red' };
    if (u.is_demo) return { label: 'Demo', cls: 'badge-purple' };
    if (!u.license) return { label: 'Ingen', cls: 'badge-slate' };
    const s = u.license.status;
    if (s === 'trialing') return { label: 'Trial', cls: 'badge-blue' };
    if (s === 'active') return { label: 'Aktiv', cls: 'badge-green' };
    if (s === 'past_due') return { label: 'Past Due', cls: 'badge-amber' };
    if (s === 'canceled') return { label: 'Kansellert', cls: 'badge-slate' };
    return { label: 'Utløpt', cls: 'badge-red' };
  };

  const badgeClasses: Record<string, string> = {
    'badge-green': 'bg-emerald-50 border-emerald-200 text-emerald-700',
    'badge-blue': 'bg-blue-50 border-blue-200 text-blue-700',
    'badge-purple': 'bg-purple-50 border-purple-200 text-purple-700',
    'badge-amber': 'bg-amber-50 border-amber-200 text-amber-700',
    'badge-red': 'bg-red-50 border-red-200 text-red-700',
    'badge-slate': 'bg-slate-100 border-slate-200 text-slate-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Brukere totalt" value={stats.total} icon={Users} color="slate" />
        <StatCard label="Prøveperiode" value={stats.trialing} icon={Clock} color="blue" />
        <StatCard label="Aktive" value={stats.active} icon={CheckCircle} color="emerald" />
        <StatCard label="Demo" value={stats.demo} icon={Shield} color="purple" />
        <StatCard label="Utløper 30d" value={stats.expiringSoon} icon={AlertTriangle} color="amber" />
        <StatCard label="Past Due" value={stats.pastDue} icon={AlertTriangle} color="red" />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk bruker..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {([
            ['all', 'Alle'],
            ['active', 'Aktive'],
            ['trialing', 'Prøve'],
            ['demo', 'Demo'],
            ['past_due', 'Past Due'],
            ['disabled', 'Deaktivert'],
            ['none', 'Ingen'],
          ] as [FilterType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                filter === key
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 sticky top-0 bg-slate-50 z-10">Navn</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 sticky top-0 bg-slate-50 z-10">E-post</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 sticky top-0 bg-slate-50 z-10 hidden lg:table-cell">Klubb</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 sticky top-0 bg-slate-50 z-10">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 sticky top-0 bg-slate-50 z-10 hidden lg:table-cell">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 sticky top-0 bg-slate-50 z-10 hidden xl:table-cell">Aktiv til</th>
                <th className="px-4 py-3 w-10 sticky top-0 bg-slate-50 z-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const badge = getStatusBadge(u);
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                      u.is_disabled ? 'opacity-50' : ''
                    } ${
                      selectedUser?.id === u.id ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => openDetail(u)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{u.full_name || 'Ukjent'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{u.club_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClasses[badge.cls]}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{u.license?.plan?.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden xl:table-cell">{u.license ? formatDate(u.license.current_period_end) : '-'}</td>
                    <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                      {menuOpen === u.id && <ActionMenu u={u} />}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Ingen brukere funnet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((u) => {
          const badge = getStatusBadge(u);
          return (
            <div
              key={u.id}
              className={`bg-white border border-slate-200 rounded-xl p-4 transition ${u.is_disabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <button onClick={() => openDetail(u)} className="text-left">
                  <p className="font-medium text-slate-900">{u.full_name || 'Ukjent'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{u.email || '-'}</p>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClasses[badge.cls]}`}>
                    {badge.label}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </button>
                    {menuOpen === u.id && <ActionMenu u={u} mobile />}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {u.license?.plan?.name && <span>Plan: <span className="text-slate-700 font-medium">{u.license.plan.name}</span></span>}
                {u.license && <span>Aktiv til: <span className="text-slate-700 font-medium">{formatDate(u.license.current_period_end)}</span></span>}
                {u.club_name && <span>{u.club_name}</span>}
              </div>
            </div>
          );
        })}
        {filteredUsers.length === 0 && (
          <p className="text-center py-8 text-slate-400 text-sm">Ingen brukere funnet</p>
        )}
      </div>

      {/* User Detail Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedUser.full_name || 'Ukjent'}</h3>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCell label="Klubb" value={selectedUser.club_name || '-'} />
                <InfoCell label="Registrert" value={formatDate(selectedUser.created_at)} />
                <InfoCell label="Demo" value={selectedUser.is_demo ? 'Ja' : 'Nei'} />
                <InfoCell label="Deaktivert" value={selectedUser.is_disabled ? 'Ja' : 'Nei'} highlight={selectedUser.is_disabled} />
              </div>

              {/* License */}
              {selectedUser.license && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Lisens</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCell label="Plan" value={selectedUser.license.plan?.name || '-'} />
                    <InfoCell label="Status" value={licenseStatusLabel(selectedUser.license.status)} />
                    <InfoCell label="Aktiv til" value={formatDate(selectedUser.license.current_period_end)} />
                    <InfoCell label="Kansellerer" value={selectedUser.license.cancel_at_period_end ? 'Ja' : 'Nei'} />
                  </div>
                </div>
              )}

              {/* Stripe */}
              {selectedUser.stripe_customer && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Stripe</h4>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-500 font-mono">{selectedUser.stripe_customer.stripe_customer_id}</span>
                    <a
                      href={`https://dashboard.stripe.com/test/customers/${selectedUser.stripe_customer.stripe_customer_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Billing Timeline */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Hendelser</h4>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Laster...</div>
                ) : billingEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">Ingen hendelser.</p>
                ) : (
                  <div className="relative pl-4 space-y-0 max-h-48 overflow-y-auto">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                    {billingEvents.map((ev) => (
                      <div key={ev.id} className="relative flex items-start gap-3 py-2">
                        <div className="absolute left-[-12px] top-[10px] w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800">{eventLabel(ev.event_type)}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(ev.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Audit Timeline */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Admin-hendelser</h4>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Laster...</div>
                ) : auditEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">Ingen admin-hendelser.</p>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto">
                    {auditEvents.map((ev) => (
                      <div key={ev.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-800">{auditLabel(ev.action)}</span>
                          <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{formatDateTime(ev.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Utført av: <span className="font-medium text-slate-700">{ev.admin_profile?.full_name || ev.admin_profile?.email || ev.admin_user_id.slice(0, 8)}</span>
                        </p>
                        {ev.details && (ev.details.ip_address || ev.details.user_agent) && (
                          <div className="mt-1.5 text-xs text-slate-400 space-y-0.5">
                            {ev.details.ip_address && <p>IP: {String(ev.details.ip_address)}</p>}
                            {ev.details.user_agent && <p className="truncate">UA: {String(ev.details.user_agent).slice(0, 60)}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable Confirm Modal */}
      {confirmAction === 'disable' && confirmTarget && (
        <ConfirmModal
          title="Deaktiver bruker"
          message={`Er du sikker på at du vil deaktivere ${confirmTarget.full_name || confirmTarget.email || 'denne brukeren'}? Brukeren vil ikke kunne bruke appen.`}
          confirmLabel="Deaktiver"
          confirmVariant="amber"
          loading={actionLoading}
          onConfirm={handleDisable}
          onCancel={() => { setConfirmAction(null); setConfirmTarget(null); }}
        />
      )}

      {/* Delete Step 1 */}
      {confirmAction === 'delete_step1' && confirmTarget && (
        <ConfirmModal
          title="Slett bruker permanent"
          message="Dette vil permanent slette brukeren og tilhørende data. Dette kan ikke angres."
          confirmLabel="Jeg forstår"
          confirmVariant="red"
          loading={false}
          onConfirm={handleDeleteStep2}
          onCancel={() => { setConfirmAction(null); setConfirmTarget(null); }}
        />
      )}

      {/* Delete Step 2 */}
      {confirmAction === 'delete_step2' && confirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => { setConfirmAction(null); setConfirmTarget(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Bekreft sletting</h3>
                <p className="text-sm text-slate-500">{confirmTarget.full_name || 'Ukjent'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">Skriv følgende for å bekrefte:</p>
            <p className="text-sm font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg mb-3 select-all">SLETT {confirmTarget.email}</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder={`SLETT ${confirmTarget.email}`}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setConfirmAction(null); setConfirmTarget(null); setDeleteConfirmText(''); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                Avbryt
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleteConfirmText !== expectedDeleteText || actionLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Slett permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function ActionMenu({ u, mobile }: { u: UserRow; mobile?: boolean }) {
    return (
      <div className={`absolute ${mobile ? 'right-0 top-10' : 'right-4 top-10'} bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-2 min-w-[200px]`}>
        <button onClick={() => openDetail(u)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 transition">
          <Eye className="w-4 h-4 text-slate-400" /> Vis detaljer
        </button>
        {u.is_demo ? (
          <button onClick={() => toggleDemo(u.id, false)} disabled={actionLoading} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 text-amber-700 transition">
            <Shield className="w-4 h-4" /> Fjern demo
          </button>
        ) : (
          <button onClick={() => toggleDemo(u.id, true)} disabled={actionLoading} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 transition">
            <Shield className="w-4 h-4 text-slate-400" /> Sett som demo
          </button>
        )}
        {!isSelf(u.id) && !u.is_disabled && (
          <button onClick={() => { setMenuOpen(null); setConfirmTarget(u); setConfirmAction('disable'); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 text-amber-700 transition">
            <ShieldOff className="w-4 h-4" /> Deaktiver bruker
          </button>
        )}
        {!isSelf(u.id) && u.is_disabled && (
          <button onClick={() => handleReactivate(u.id)} disabled={actionLoading} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 text-emerald-700 transition">
            <RotateCcw className="w-4 h-4" /> Reaktiver bruker
          </button>
        )}
        {u.stripe_customer && (
          <a href={`https://dashboard.stripe.com/test/customers/${u.stripe_customer.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 transition" onClick={() => setMenuOpen(null)}>
            <ExternalLink className="w-4 h-4 text-slate-400" /> Stripe Customer
          </a>
        )}
        {!isSelf(u.id) && (
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button onClick={() => handleDeleteStep1(u)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-2.5 text-red-700 transition">
              <Trash2 className="w-4 h-4" /> Slett permanent
            </button>
          </div>
        )}
      </div>
    );
  }
}

function ConfirmModal({ title, message, confirmLabel, confirmVariant, loading, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; confirmVariant: 'amber' | 'red'; loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const btnClass = confirmVariant === 'red'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-amber-600 hover:bg-amber-700 text-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
            Avbryt
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${btnClass}`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500', text: 'text-slate-900' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', text: 'text-emerald-900' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-700', text: 'text-purple-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', text: 'text-amber-900' },
    red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-700', text: 'text-red-700' },
  };
  const c = colors[color] || colors.slate;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3 sm:p-4 hover:shadow-sm transition`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className="text-xs font-medium text-slate-500 truncate">{label}</span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${c.text}`}>{value}</p>
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function licenseStatusLabel(status: string): string {
  const m: Record<string, string> = { trialing: 'Prøveperiode', active: 'Aktiv', past_due: 'Forfalt', canceled: 'Kansellert', expired: 'Utløpt' };
  return m[status] || status;
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    trial_started: 'Trial startet',
    checkout_completed: 'Checkout fullført',
    invoice_paid: 'Faktura betalt',
    subscription_updated: 'Abonnement oppdatert',
    subscription_canceled: 'Abonnement kansellert',
    payment_failed: 'Betaling feilet',
  };
  return labels[type] || type;
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    user_disabled: 'Bruker deaktivert',
    user_reactivated: 'Bruker reaktivert',
    user_delete_requested: 'Sletting startet',
    user_deleted: 'Bruker slettet',
    set_demo: 'Satt som demo',
    remove_demo: 'Demo fjernet',
  };
  return labels[action] || action;
}
