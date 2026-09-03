import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  Image,
  ImagePlus,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApplicationReviewInputReviewStatus,
  ApplicationStatus,
  customFetch,
  getGetAdminApplicationQueryKey,
  getGetAdminApplicationsQueryKey,
  getGetAdminDashboardStatsQueryKey,
  getGetAdminMeQueryKey,
  getGetAdminRecentApplicationsQueryKey,
  setBaseUrl,
  setAuthTokenGetter,
  useAdminLogin,
  useGetAdminApplication,
  useGetAdminApplications,
  useGetAdminDashboardStats,
  useGetAdminMe,
  useGetAdminRecentApplications,
  useReviewAdminApplication,
  type Application,
  type GetAdminApplicationsParams,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const NAD_API = 'http://localhost:8083';
const queryClient = new QueryClient();
setBaseUrl('http://localhost:8083');
setAuthTokenGetter(() => localStorage.getItem('nap_admin_token'));

function useGetSiteSettings() {
  return useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: () => customFetch<Array<{ id: number; tenantId: number; settingKey: string; settingValue: string }>>('/api/v1/admin/site-settings'),
  });
}

function useUpdateSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { settingKey: string; settingValue: string }) =>
      customFetch<{ id: number; settingKey: string; settingValue: string }>('/api/v1/admin/site-settings', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'site-settings'] }),
  });
}

function formatDate(date: string | null | undefined, withTime = false) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed);
}

function initials(name = '') {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'NA';
}

function statusLabel(status?: string) {
  return status?.toLowerCase().replace('_', ' ') || 'not set';
}

function StatusPill({ status }: { status?: string }) {
  const normalized = status?.toUpperCase();
  const styles: Record<string, string> = {
    SUBMITTED: 'bg-[hsl(42_86%_65%/0.25)] text-[hsl(31_59%_28%)] border-[hsl(42_61%_61%)]',
    ADMITTED: 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)] border-[hsl(160_31%_67%)]',
    REJECTED: 'bg-[hsl(5_52%_91%)] text-[hsl(5_52%_38%)] border-[hsl(5_45%_76%)]',
    WAITLISTED: 'bg-[hsl(203_42%_90%)] text-[hsl(203_51%_30%)] border-[hsl(203_37%_72%)]',
    DRAFT: 'bg-[hsl(40_19%_91%)] text-[hsl(190_13%_45%)] border-[hsl(40_17%_80%)]',
  };
  return (
    <span data-testid={`status-${normalized?.toLowerCase() || 'unknown'}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${styles[normalized || ''] || styles.DRAFT}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {statusLabel(status)}
    </span>
  );
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-nexus">
      <div className="relative flex size-9 items-center justify-center rounded-[11px] bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm">
        <GraduationCap size={20} strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[hsl(var(--accent))]" />
      </div>
      {!compact && <div><p className="text-sm font-bold leading-none tracking-tight">Nexus</p><p className="mt-1 text-[10px] uppercase tracking-[.2em] opacity-60">Admissions office</p></div>}
    </div>
  );
}

function PageLoader({ label = 'Preparing your workspace' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-72 space-y-4 text-center">
        <div className="mx-auto size-10 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
        <div className="h-3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <p className="nexus-kicker text-[hsl(var(--muted-foreground))]">{label}</p>
      </div>
    </div>
  );
}

function ErrorState({ message = 'We could not load this view.', retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-7 py-14 text-center shadow-sm">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"><XCircle size={23} /></div>
      <h2 className="nexus-serif text-2xl">A small interruption</h2>
      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message}</p>
      {retry && <Button data-testid="button-retry" onClick={retry} variant="outline" className="mt-6 gap-2"><RefreshCw size={15} /> Try again</Button>}
    </div>
  );
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><ClipboardList size={25} /></div>
      <h3 className="nexus-serif text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p>
      {action}
    </div>
  );
}

function Shell({ children, identity }: { children: ReactNode; identity?: { fullName: string; email: string } }) {
  const [location, setLocation] = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const nav = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/applications', label: 'Applications', icon: ClipboardList },
    { href: '/admin/programs', label: 'Programs', icon: GraduationCap },
    { href: '/admin/settings', label: 'Site Settings', icon: Settings },
  ];
  const logout = () => {
    localStorage.removeItem('nap_admin_token');
    queryClient.clear();
    setLocation('/admin/login');
  };
  return (
    <div className="nexus-shell flex">
      <button aria-label="Close navigation" data-testid="button-close-nav" onClick={() => setMobileNav(false)} className={`fixed inset-0 z-30 bg-[hsl(190_32%_12%/.4)] transition-opacity md:hidden ${mobileNav ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside className={`nexus-sidebar fixed inset-y-0 left-0 z-40 flex w-[250px] -translate-x-full flex-col border-r border-[hsl(var(--sidebar-border))] px-5 py-6 transition-transform duration-300 md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 ${mobileNav ? 'translate-x-0' : ''}`}>
        <div className="mb-12 flex items-center justify-between"><LogoMark /><button data-testid="button-close-nav-mobile" aria-label="Close navigation" className="md:hidden" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="mb-3 px-3 nexus-kicker opacity-45">Workspace</div>
        <nav className="space-y-1" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? location === '/admin' : location.startsWith(href);
            return <Link key={href} href={href} data-testid={`link-${label.toLowerCase()}`} onClick={() => setMobileNav(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm' : 'opacity-65 hover:bg-[hsl(var(--sidebar-accent)/.65)] hover:opacity-100'}`}><Icon size={17} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span>{label === 'Applications' && <span className="ml-auto rounded-md bg-[hsl(var(--sidebar-primary)/.18)] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--sidebar-primary))]">LIVE</span>}</Link>;
          })}
        </nav>
        <div className="mt-auto">
          <div className="mb-5 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.45)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[hsl(var(--sidebar-primary))]"><ShieldCheck size={15} /><span className="nexus-kicker">Trust & privacy</span></div>
            <p className="text-xs leading-5 opacity-60">Student records are restricted to authorised admissions staff.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] pt-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--sidebar-primary))] text-xs font-bold text-[hsl(var(--sidebar-primary-foreground))]">{initials(identity?.fullName)}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{identity?.fullName || 'Admissions staff'}</p><p className="truncate text-[10px] opacity-50">{identity?.email}</p></div>
            <button data-testid="button-logout" aria-label="Sign out" onClick={logout} className="opacity-50 transition-opacity hover:opacity-100"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border)/.8)] bg-[hsl(var(--background)/.92)] px-5 backdrop-blur-md md:px-10">
          <div className="flex items-center gap-3"><button data-testid="button-open-nav" aria-label="Open navigation" onClick={() => setMobileNav(true)} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] md:hidden"><Menu size={20} /></button><div className="hidden md:block nexus-kicker text-[hsl(var(--muted-foreground))]">NEXUS / REGISTRARIAL SERVICES</div><span className="md:hidden"><LogoMark compact /></span></div>
          <div className="flex items-center gap-4"><span className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:inline">2025 intake · Semester one</span><button data-testid="button-notifications" aria-label="Notifications" className="relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Bell size={18} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[hsl(var(--destructive))]" /></button></div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem('nap_admin_token');
  const me = useGetAdminMe({ query: { enabled: Boolean(token), queryKey: getGetAdminMeQueryKey(), retry: false } });
  console.log('[AUTH-GATE] token:', token ? token.substring(0, 20) + '...' : 'null', '| status:', me.status, '| fetchStatus:', me.fetchStatus, '| isError:', me.isError, '| data:', me.data);
  if (me.isError) console.error('[AUTH-GATE] /auth/me error:', me.error);
  useEffect(() => {
    if (!token) { console.log('[AUTH-GATE] No token — redirecting to login'); setLocation('/admin/login'); return; }
    if (me.isError) { console.log('[AUTH-GATE] Auth failed — redirecting to login'); localStorage.removeItem('nap_admin_token'); setLocation('/admin/login'); }
  }, [me.isError, me.error, setLocation, token]);
  if (!token || me.status === 'pending') return <PageLoader label="Checking secure access" />;
  if (me.isError) return null;
  if (!me.data) return <PageLoader label="Checking secure access" />;
  return <Shell identity={me.data}>{children}</Shell>;
}

function PartnersManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => customFetch<Record<string, string>[]>(`${NAD_API}/api/v1/admin/partners`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`${NAD_API}/api/v1/admin/partners/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-partners'] }),
  });

  if (showForm) {
    return <PartnerForm partner={editing} onClose={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><span className="mr-1">+</span> Add Partner</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
      ) : partners.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">No partners yet.</p>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.3)] transition-colors">
              {p.logoUrl && <img src={p.logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name || 'Unnamed'}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{p.description || 'No description'}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setShowForm(true); }}><Pencil size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this partner?')) deleteMutation.mutate(Number(p.id)); }} className="text-red-500 hover:text-red-600"><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerForm({ partner, onClose }: { partner: Record<string, string> | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: partner?.name || '',
    description: partner?.description || '',
    logoUrl: partner?.logoUrl || '',
    websiteUrl: partner?.websiteUrl || '',
    tenantId: partner?.tenantId || '1',
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:8080/api/v1/storage/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, logoUrl: data.url || data.fileUrl || '' }));
      }
    } finally { setUploading(false); }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (partner?.id) return customFetch(`${NAD_API}/api/v1/admin/partners/${partner.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return customFetch(`${NAD_API}/api/v1/admin/partners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      onClose();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft size={16} /></Button>
        <h3 className="text-sm font-semibold">{partner ? 'Edit Partner' : 'Add Partner'}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Name *</label>
          <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Ministry of Education" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Website URL</label>
          <Input value={form.websiteUrl} onChange={(e) => setForm(prev => ({ ...prev, websiteUrl: e.target.value }))} placeholder="e.g. https://example.com" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
        <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="Brief description of the partner..." />
      </div>
      <div>
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Logo</label>
        <div className="flex gap-4 items-start">
          <label className="flex flex-col items-center justify-center gap-2 w-32 h-32 border-2 border-dashed border-[hsl(var(--border))] rounded-xl cursor-pointer hover:border-[hsl(var(--primary)/.5)] hover:bg-[hsl(var(--muted)/.2)] transition-all">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <Image size={24} className="text-[hsl(var(--muted-foreground))]" />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] text-center px-1">{uploading ? 'Uploading...' : 'Click to upload'}</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
          </label>
          {form.logoUrl && (
            <button onClick={() => setForm(prev => ({ ...prev, logoUrl: '' }))} className="text-xs text-red-500 hover:text-red-600 mt-1">Remove</button>
          )}
        </div>
      </div>
      <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : partner ? 'Update Partner' : 'Create Partner'}
      </Button>
    </div>
  );
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const login = useAdminLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;
    console.log('[LOGIN] Submitting login for:', email);
    login.mutate({ data: { email, password } }, { onSuccess: (session) => { console.log('[LOGIN] Success — token:', session.token?.substring(0, 20) + '...'); localStorage.setItem('nap_admin_token', session.token); setLocation('/admin'); }, onError: (err) => { console.error('[LOGIN] Failed:', err); } });
  };
  return (
    <div className="flex min-h-[100dvh] bg-[hsl(var(--background))]">
      <div className="relative hidden w-[46%] overflow-hidden bg-[hsl(var(--sidebar))] p-12 text-[hsl(var(--sidebar-foreground))] lg:flex lg:flex-col">
        <div className="absolute -right-28 top-24 size-[420px] rounded-full border border-[hsl(var(--sidebar-primary)/.18)]" /><div className="absolute -right-6 top-56 size-[280px] rounded-full border border-[hsl(var(--sidebar-primary)/.12)]" />
        <LogoMark />
        <div className="relative mt-auto max-w-md"><p className="nexus-kicker mb-5 text-[hsl(var(--sidebar-primary))]">Admissions, with discernment</p><h1 className="nexus-serif text-6xl leading-[.94]">Every application is a story worth reading.</h1><p className="mt-7 max-w-sm text-sm leading-6 opacity-60">A considered workspace for the people who shape the next chapter of Nexus University.</p><div className="mt-16 flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] pt-5 text-xs opacity-45"><ShieldCheck size={15} /> Private workspace · authorised personnel only</div></div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-[410px] fade-up">
        <div className="mb-10 lg:hidden"><LogoMark /></div>
        <div className="mb-9"><p className="nexus-kicker mb-3 text-[hsl(var(--primary))]">Administrator access</p><h2 className="nexus-serif text-4xl">Welcome back.</h2><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Sign in to continue reviewing the 2026/2027 intake.</p></div>
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-semibold">Work email</span><Input data-testid="input-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nexus.ac.ug" autoComplete="email" className="h-12 bg-[hsl(var(--card))] px-4" /></label>
          <label className="block"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">Password</span><button type="button" data-testid="button-toggle-password" onClick={() => setShowPassword(!showPassword)} className="text-[11px] text-[hsl(var(--primary))] hover:underline">{showPassword ? 'Hide' : 'Show'}</button></div><Input data-testid="input-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" className="h-12 bg-[hsl(var(--card))] px-4" /></label>
          {login.isError && <div data-testid="status-login-error" className="rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-xs leading-5 text-[hsl(var(--destructive))]">We couldn't sign you in. Check your email and password, then try again.</div>}
          <Button data-testid="button-sign-in" type="submit" disabled={login.isPending || !email || !password} className="h-12 w-full rounded-xl bg-[hsl(var(--primary))] text-sm font-bold">{login.isPending ? <><Loader2 size={16} className="animate-spin" /> Verifying access</> : <>Enter workspace <ArrowRight size={16} /></>}</Button>
         </form>
         <div className="mt-5 rounded-xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] px-4 py-3 text-[11px] leading-5 text-[hsl(var(--foreground)/.75)]"><p className="nexus-kicker mb-1 text-[hsl(var(--primary))]">Demo access</p><p>admin@nexus.edu <span className="mx-1 opacity-40">·</span> admin123</p></div>
        <div className="mt-12 flex items-start gap-3 border-t border-[hsl(var(--border))] pt-5 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /><p>Access is monitored and protected. If you need assistance, contact the registrar's office.</p></div>
      </div></div>
    </div>
  );
}

function StatCard({ label, value, note, icon: Icon, tone = 'primary', delay = '' }: { label: string; value: number | string; note: string; icon: typeof UsersRound; tone?: string; delay?: string }) {
  return <div className={`nexus-card fade-up ${delay} relative overflow-hidden p-5`}><div className={`mb-6 flex size-9 items-center justify-center rounded-xl ${tone === 'gold' ? 'bg-[hsl(var(--accent)/.28)] text-[hsl(31_59%_28%)]' : tone === 'red' ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : tone === 'green' ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}><Icon size={18} /></div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`} className="mt-1 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{note}</p><div className="absolute -bottom-9 -right-8 size-28 rounded-full border border-[hsl(var(--border)/.6)]" /></div>;
}

function DashboardPage() {
  const stats = useGetAdminDashboardStats();
  const recent = useGetAdminRecentApplications({ limit: 6 });
  const [, setLocation] = useLocation();

  console.log('[DASH] stats loading:', stats.isLoading, 'error:', stats.error, 'data:', stats.data);
  console.log('[DASH] recent loading:', recent.isLoading, 'error:', recent.error, 'data:', recent.data);
  if (stats.error) console.error('[DASH] stats error:', stats.error);
  if (recent.error) console.error('[DASH] recent error:', recent.error);

  if (stats.isLoading) return <PageLoader label="Gathering admissions overview" />;
  if (stats.isError) return <ErrorState retry={() => stats.refetch()} />;
  const data = stats.data;
  const trend = data?.monthlyTrend || {};
  const trendEntries = Object.entries(trend);
  const maxTrend = Math.max(...trendEntries.map(([, value]) => value), 1);
  return <div className="space-y-8">
    <section className="fade-up flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="nexus-kicker mb-3 text-[hsl(var(--primary))]">Tuesday, 18 June 2025</p><h1 className="nexus-serif text-4xl tracking-tight md:text-5xl">Good morning, team.</h1><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Here is the shape of the admissions desk today.</p></div><Button data-testid="button-view-all-applications" onClick={() => setLocation('/admin/applications')} variant="outline" className="w-fit gap-2 rounded-xl">Review applications <ArrowRight size={15} /></Button></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total applications" value={data?.totalApplications ?? 0} note="Across the 2025 intake" icon={UsersRound} delay="delay-1" />
      <StatCard label="Awaiting review" value={data?.pendingReview ?? 0} note="Needs an admissions decision" icon={Clock3} tone="gold" delay="delay-2" />
      <StatCard label="Admitted" value={data?.admitted ?? 0} note="Offers ready to progress" icon={CheckCircle2} tone="green" delay="delay-3" />
      <StatCard label="Draft records" value={data?.draft ?? 0} note="Not yet submitted" icon={FileText} tone="red" delay="delay-3" />
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="nexus-card p-6 md:p-7"><div className="flex items-start justify-between"><div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">Application volume</p><h2 className="mt-2 text-lg font-semibold">Monthly submissions</h2></div><div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5 text-[11px] text-[hsl(var(--muted-foreground))]"><BarChart3 size={14} /> 2025 intake</div></div><div className="mt-8 flex h-44 items-end gap-2 border-b border-l border-[hsl(var(--border))] px-3 pb-0 sm:gap-4">{trendEntries.length ? trendEntries.map(([month, value]) => <div key={month} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">{value}</span><div className="w-full max-w-10 rounded-t-md bg-[hsl(var(--primary))] transition-all duration-500 group-hover:bg-[hsl(var(--accent))]" style={{ height: `${Math.max((value / maxTrend) * 82, 5)}%` }} /><span className="nexus-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">{month.slice(0, 3)}</span></div>) : <div className="flex w-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">No monthly activity yet</div>}</div></div>
      <div className="nexus-card p-6 md:p-7"><div className="flex items-start justify-between"><div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">Decision mix</p><h2 className="mt-2 text-lg font-semibold">Where things stand</h2></div><SlidersHorizontal size={17} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-8 space-y-4">{[['Admitted', data?.admitted, 'bg-[hsl(160_43%_40%)]'], ['Waitlisted', data?.waitlisted, 'bg-[hsl(203_51%_50%)]'], ['Rejected', data?.rejected, 'bg-[hsl(var(--destructive))]'], ['In review', data?.pendingReview, 'bg-[hsl(var(--accent))]']].map(([label, value, color]) => <div key={label as string}><div className="mb-1.5 flex justify-between text-xs"><span>{label as string}</span><span className="nexus-mono text-[10px] text-[hsl(var(--muted-foreground))]">{value as number || 0}</span></div><div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(((Number(value) || 0) / (data?.totalApplications || 1)) * 100, 100)}%` }} /></div></div>)}</div></div>
    </section>
    <section className="nexus-card overflow-hidden"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-5"><div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">Latest arrivals</p><h2 className="mt-1 text-lg font-semibold">Recently submitted</h2></div><Link href="/admin/applications" data-testid="link-recent-all" className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline">See all <ArrowRight size={14} /></Link></div>{recent.isLoading ? <div className="space-y-4 p-6">{[1, 2, 3].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />)}</div> : recent.isError ? <div className="p-6"><ErrorState retry={() => recent.refetch()} /></div> : recent.data?.length ? <div className="divide-y divide-[hsl(var(--border))]">{recent.data.map((app) => <button data-testid={`row-recent-${app.id}`} key={app.id} onClick={() => setLocation(`/admin/applications/${app.id}`)} className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[hsl(var(--muted)/.45)]"><div className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-xs font-bold text-[hsl(var(--primary))]">{initials(`${app.firstName} ${app.lastName}`)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{app.firstName} {app.lastName}</p><p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">{app.prn} · {app.programChoice1 || 'Programme not selected'}</p></div><div className="hidden text-right sm:block"><p className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(app.submittedAt || app.createdAt)}</p><div className="mt-1"><StatusPill status={app.status} /></div></div><ChevronRight size={16} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div> : <EmptyState title="The desk is quiet" detail="Newly submitted applications will appear here for a quick first look." />}</section>
  </div>;
}

function ApplicationsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<GetAdminApplicationsParams['status']>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const params = useMemo<GetAdminApplicationsParams>(() => ({ search: search || undefined, status, page, size }), [search, status, page, size]);
  const results = useGetAdminApplications(params);
  const content = results.data?.content || [];

  console.log('[APPS] loading:', results.isLoading, 'error:', results.error, 'data:', results.data, 'content length:', content.length);
  if (results.error) console.error('[APPS] fetch error:', results.error);
  if (results.data) console.log('[APPS] totalElements:', results.data.totalElements, 'totalPages:', results.data.totalPages);
  const hasFilters = Boolean(search || status !== 'ALL');
  const clearFilters = () => { setSearch(''); setStatus('ALL'); setPage(0); };
  return <div className="space-y-7">
    <section className="fade-up flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="nexus-kicker mb-3 text-[hsl(var(--primary))]">Application register</p><h1 className="nexus-serif text-4xl tracking-tight md:text-5xl">Applications.</h1><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Search, filter and move each student’s application forward.</p></div><div className="nexus-mono text-right text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]"><span className="text-xl font-bold text-[hsl(var(--foreground))]">{results.data?.totalElements ?? '—'}</span><br />total records</div></section>
    <section className="nexus-card p-4 md:p-5"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><Input data-testid="input-application-search" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search by name, PRN or email" className="h-11 border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10" /></div><div className="flex gap-3"><div className="relative flex-1 sm:flex-none"><Filter size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><select data-testid="select-status-filter" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as GetAdminApplicationsParams['status']); setPage(0); }} className="h-11 w-full appearance-none rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-8 text-sm outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] sm:w-44"><option value="ALL">All statuses</option><option value="SUBMITTED">Submitted</option><option value="ADMITTED">Admitted</option><option value="WAITLISTED">Waitlisted</option><option value="REJECTED">Rejected</option><option value="DRAFT">Draft</option></select></div><Button data-testid="button-filter-options" variant="outline" className="hidden h-11 gap-2 sm:inline-flex"><SlidersHorizontal size={15} /> <span className="hidden xl:inline">More filters</span></Button>{hasFilters && <Button data-testid="button-clear-filters" onClick={clearFilters} variant="ghost" className="h-11 px-3 text-xs">Clear</Button>}</div></div></section>
    <section className="nexus-card overflow-hidden">{results.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4, 5].map((n) => <div className="h-[68px] animate-pulse rounded-lg bg-[hsl(var(--muted))]" key={n} />)}</div> : results.isError ? <div className="p-6"><ErrorState message="The application register is temporarily unavailable." retry={() => results.refetch()} /></div> : content.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-6 py-4 font-bold">Applicant</th><th className="px-4 py-4 font-bold">Programme</th><th className="px-4 py-4 font-bold">Submitted</th><th className="px-4 py-4 font-bold">Status</th><th className="px-6 py-4 text-right font-bold">Open</th></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]">{content.map((app) => <ApplicationRow app={app} key={app.id} onOpen={() => setLocation(`/admin/applications/${app.id}`)} />)}</tbody></table></div><div className="divide-y divide-[hsl(var(--border))] md:hidden">{content.map((app) => <button data-testid={`card-application-${app.id}`} key={app.id} onClick={() => setLocation(`/admin/applications/${app.id}`)} className="flex w-full items-center gap-3 p-4 text-left"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-xs font-bold text-[hsl(var(--primary))]">{initials(`${app.firstName} ${app.lastName}`)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{app.firstName} {app.lastName}</p><p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{app.prn} · {app.programChoice1}</p><div className="mt-2"><StatusPill status={app.status} /></div></div><ChevronRight size={17} /></button>)}</div><Pagination page={results.data?.page ?? page} totalPages={results.data?.totalPages ?? 0} size={size} total={results.data?.totalElements ?? 0} onPage={setPage} onSize={(next) => { setSize(next); setPage(0); }} /></> : <EmptyState title={hasFilters ? 'No matching applications' : 'No applications yet'} detail={hasFilters ? 'Try another search or remove the filters to widen the register.' : 'Submitted student applications will appear in this register.'} action={hasFilters ? <Button data-testid="button-empty-clear" onClick={clearFilters} variant="outline" className="mt-5">Clear filters</Button> : undefined} />}</section>
  </div>;
}

function ApplicationRow({ app, onOpen }: { app: Application; onOpen: () => void }) {
  const queryClient = useQueryClient();
  const review = useReviewAdminApplication();
  const canReview = app.status === 'DRAFT' || app.status === 'SUBMITTED';
  const handleQuickReview = (status: 'admitted' | 'rejected', e: React.MouseEvent) => {
    e.stopPropagation();
    const label = status === 'admitted' ? 'admit' : 'reject';
    if (!window.confirm(`Confirm decision to ${label} ${app.firstName} ${app.lastName}'s application?`)) return;
    review.mutate({ id: app.id, data: { reviewStatus: status as ApplicationReviewInputReviewStatus, notes: '' } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminRecentApplicationsQueryKey({ limit: 6 }) });
      },
    });
  };
  return <tr data-testid={`row-application-${app.id}`} className="group transition-colors hover:bg-[hsl(var(--muted)/.4)]"><td className="px-6 py-4"><button data-testid={`button-open-application-${app.id}`} onClick={onOpen} className="flex items-center gap-3 text-left"><div className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)] text-xs font-bold text-[hsl(var(--primary))]">{initials(`${app.firstName} ${app.lastName}`)}</div><div><p className="text-sm font-semibold group-hover:text-[hsl(var(--primary))]">{app.firstName} {app.lastName}</p><p className="nexus-mono mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{app.prn}</p></div></button></td><td className="max-w-[220px] truncate px-4 py-4 text-xs text-[hsl(var(--muted-foreground))]">{app.programChoice1 || 'Not selected'}<br /><span className="text-[10px]">{app.studyMode || 'Study mode not set'}</span></td><td className="px-4 py-4 text-xs text-[hsl(var(--muted-foreground))]">{formatDate(app.submittedAt || app.createdAt)}</td><td className="px-4 py-4"><StatusPill status={app.status} /></td><td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1">{canReview && review.isPending !== true && <><button data-testid={`button-quick-admit-${app.id}`} onClick={(e) => handleQuickReview('admitted', e)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[hsl(160_43%_40%)] hover:bg-[hsl(160_43%_40%/.1)]"><CheckCircle2 size={13} /> Admit</button><button data-testid={`button-quick-reject-${app.id}`} onClick={(e) => handleQuickReview('rejected', e)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"><XCircle size={13} /> Reject</button></>}<button data-testid={`button-view-application-${app.id}`} onClick={onOpen} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]"><ExternalLink size={16} /></button></div></td></tr>;
}

function Pagination({ page, totalPages, size, total, onPage, onSize }: { page: number; totalPages: number; size: number; total: number; onPage: (page: number) => void; onSize: (size: number) => void }) {
  if (!total) return null;
  return <div className="flex flex-col items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-5 py-4 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row"><p>Showing <span className="font-semibold text-[hsl(var(--foreground))]">{page * size + 1}–{Math.min((page + 1) * size, total)}</span> of <span className="font-semibold text-[hsl(var(--foreground))]">{total}</span></p><div className="flex items-center gap-2"><label className="mr-2 flex items-center gap-2">Rows <select data-testid="select-page-size" value={size} onChange={(e) => onSize(Number(e.target.value))} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label><button data-testid="button-page-previous" aria-label="Previous page" disabled={page <= 0} onClick={() => onPage(page - 1)} className="rounded-md border border-[hsl(var(--border))] p-1.5 disabled:opacity-30"><ChevronLeft size={15} /></button><span className="nexus-mono min-w-16 text-center text-[10px]">{page + 1} / {Math.max(totalPages, 1)}</span><button data-testid="button-page-next" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} className="rounded-md border border-[hsl(var(--border))] p-1.5 disabled:opacity-30"><ChevronRight size={15} /></button></div></div>;
}

function DetailField({ label, value, mono = false }: { label: string; value?: string | number | boolean | null; mono?: boolean }) {
  return <div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`detail-${label.toLowerCase().replaceAll(' ', '-')}`} className={`mt-1.5 text-sm ${mono ? 'nexus-mono text-xs' : ''}`}>{typeof value === 'boolean' ? (value ? 'Verified' : 'Not verified') : value || '—'}</p></div>;
}

const API_BASE = 'http://localhost:8080';
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function DocumentField({ label, url }: { label: string; url?: string | null }) {
  if (!url) return <div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1.5 text-sm">—</p></div>;
  const fullUrl = url.startsWith('/api/') ? `${API_BASE}${url}` : url;
  const ext = url.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTS.some(e => ext === e.slice(1));
  const isPdf = ext === 'pdf';
  const filename = url.split('/').pop() || url;
  return <div><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">{label}</p><div className="mt-2">{isImage ? <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block"><img src={fullUrl} alt={label} className="max-h-40 rounded-lg border border-[hsl(var(--border))] object-cover transition-shadow hover:ring-2 hover:ring-[hsl(var(--primary))]" loading="lazy" /></a> : <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-[hsl(var(--primary))] hover:underline">{isPdf ? <FileText size={14} /> : <Download size={14} />} <span className="max-w-[220px] truncate">{filename}</span></a>}</div></div>;
}

function SubjectTable({ label, json }: { label: string; json?: string | null }) {
  let subjects: { subject: string; grade: string }[] = [];
  try { subjects = JSON.parse(json || '[]'); } catch { /* ignore */ }
  const rows = subjects.filter(s => s.subject && s.subject.trim());
  return <div className="sm:col-span-2 lg:col-span-3"><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">{label}</p>{rows.length > 0 ? <div className="mt-2 overflow-hidden rounded-lg border border-[hsl(var(--border))]"><table className="w-full text-xs"><thead><tr className="bg-[hsl(var(--muted)/.4)]"><th className="px-3 py-2 text-left font-bold">Subject</th><th className="px-3 py-2 text-left font-bold">Grade</th></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]">{rows.map((s, i) => <tr key={i} className="hover:bg-[hsl(var(--muted)/.3)]"><td className="px-3 py-2">{s.subject}</td><td className="px-3 py-2 font-semibold">{s.grade}</td></tr>)}</tbody></table></div> : <p className="mt-1.5 text-sm">—</p>}</div>;
}

function ReviewPanel({ app }: { app: Application }) {
  const queryClient = useQueryClient();
  const review = useReviewAdminApplication();
  const [choice, setChoice] = useState<'admitted' | 'waitlisted' | 'rejected'>('admitted');
  const [notes, setNotes] = useState(app.reviewerNotes || '');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const submitReview = () => {
    const label = choice === 'admitted' ? 'admit' : choice === 'waitlisted' ? 'waitlist' : 'reject';
    if (!window.confirm(`Confirm decision to ${label} ${app.firstName} ${app.lastName}'s application?`)) return;
    const data = { reviewStatus: ApplicationReviewInputReviewStatus[choice], notes };
    console.log('[ReviewPanel] submitting review', { id: app.id, choice, data });
    setErrorMsg('');
    review.mutate({ id: app.id, data }, { onSuccess: (resp) => { console.log('[ReviewPanel] review success', resp); setNotice('Decision recorded successfully.'); queryClient.invalidateQueries({ queryKey: getGetAdminApplicationQueryKey(app.id) }); queryClient.invalidateQueries({ queryKey: getGetAdminApplicationsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAdminDashboardStatsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAdminRecentApplicationsQueryKey({ limit: 6 }) }); }, onError: (err: any) => { console.error('[ReviewPanel] review FAILED', err); const detail = err?.response?.data?.message || err?.data?.message || err?.response?.data?.error || err?.message || String(err); setErrorMsg(detail); } });
  };
  if (app.status !== ApplicationStatus.SUBMITTED && app.status !== ApplicationStatus.DRAFT) return <div className="nexus-card border-l-4 border-l-[hsl(var(--primary))] p-5"><div className="flex gap-3"><FileCheck2 size={18} className="mt-0.5 text-[hsl(var(--primary))]" /><div><p className="text-sm font-semibold">This application has been reviewed</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The decision is <strong className="capitalize text-[hsl(var(--foreground))]">{statusLabel(app.status)}</strong>. Review controls are available only for draft and submitted records.</p>{app.reviewerNotes && <blockquote className="mt-4 border-l-2 border-[hsl(var(--border))] pl-3 text-sm italic text-[hsl(var(--muted-foreground))]">“{app.reviewerNotes}”</blockquote>}</div></div></div>;
  return <div className="nexus-card overflow-hidden border-[hsl(var(--accent)/.6)]"><div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--accent)/.12)] px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[hsl(31_59%_28%)]" /><p className="text-sm font-bold">Record a decision</p></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Choose one outcome and leave a clear audit note.</p></div><div className="space-y-5 p-5"><div className="grid grid-cols-3 gap-2">{(['admitted', 'waitlisted', 'rejected'] as const).map((option) => <button data-testid={`button-review-${option}`} key={option} onClick={() => setChoice(option)} className={`rounded-xl border px-2 py-3 text-xs font-semibold capitalize transition-all ${choice === option ? option === 'rejected' ? 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]' : 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'}`}>{option}</button>)}</div><label className="block"><span className="mb-2 block text-xs font-semibold">Reviewer note <span className="font-normal text-[hsl(var(--muted-foreground))]">(recommended)</span></span><textarea data-testid="textarea-review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Add context for the decision…" className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-1 focus:ring-[hsl(var(--ring))]" /></label>{notice && <div data-testid="status-review-success" className="flex items-center gap-2 rounded-lg bg-[hsl(160_35%_85%)] px-3 py-2 text-xs text-[hsl(160_43%_25%)]"><CheckCircle2 size={14} /> {notice}</div>}{errorMsg && <div data-testid="status-review-error" className="rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs text-[hsl(var(--destructive))]">Error: {errorMsg}</div>}{review.isError && !errorMsg && <div className="text-xs text-[hsl(var(--destructive))]">We couldn't save this decision. Please try again.</div>}<Button data-testid="button-submit-review" onClick={submitReview} disabled={review.isPending} className="h-11 w-full rounded-xl font-bold">{review.isPending ? <><Loader2 size={15} className="animate-spin" /> Saving decision</> : <><Check size={15} /> Confirm decision</>}</Button></div></div>;
}

interface QualificationEntry {
  programmeCode: string;
  programmeName: string;
  qualified: boolean;
  totalScore: number;
  adjustedScore?: number;
  genderBonus?: boolean;
  cutoffScore: number;
  oLevelScore: number;
  aLevelScore: number;
  reason: string;
}

function SuggestedProgrammeCard({ app }: { app: Application }) {
  const suggestion = useMemo(() => {
    if (!app.qualificationResults) return null;
    try {
      const results = JSON.parse(app.qualificationResults) as QualificationEntry[];
      const qualified = results.filter((r) => r.qualified);
      if (!qualified.length) return null;
      return qualified.sort((a, b) => (b.adjustedScore ?? b.totalScore) - (a.adjustedScore ?? a.totalScore))[0];
    } catch {
      return null;
    }
  }, [app.qualificationResults]);

  if (!suggestion) return null;

  const score = suggestion.adjustedScore ?? suggestion.totalScore;
  const hasBonus = suggestion.genderBonus === true;

  return (
    <div className="nexus-card overflow-hidden border-[hsl(280_65%_55%)/.3]">
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(280_65%_55%)/.08] px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[hsl(280_65%_55%)]" />
          <p className="text-sm font-bold">Suggested Programme</p>
        </div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">AI-recommended based on marks &amp; gender bonus</p>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-sm font-bold text-[hsl(var(--foreground))]">{suggestion.programmeName || suggestion.programmeCode}</p>
          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{suggestion.programmeCode}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg bg-[hsl(var(--muted)/.5)] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Score</p>
            <p className="mt-0.5 text-lg font-bold text-[hsl(var(--foreground))]">{score.toFixed(1)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-[hsl(var(--muted)/.5)] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Cutoff</p>
            <p className="mt-0.5 text-lg font-bold text-[hsl(var(--foreground))]">{suggestion.cutoffScore.toFixed(1)}</p>
          </div>
        </div>
        {hasBonus && (
          <div className="flex items-center gap-1.5 rounded-full bg-[hsl(280_65%_55%)/.1] px-3 py-1.5">
            <Sparkles size={12} className="text-[hsl(280_65%_55%)]" />
            <span className="text-[11px] font-semibold text-[hsl(280_65%_55%)]">+1.5 female applicant bonus applied</span>
          </div>
        )}
        <p className="text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{suggestion.reason}</p>
      </div>
    </div>
  );
}

function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = Number(params.id);
  const appQuery = useGetAdminApplication(id, { query: { enabled: Number.isFinite(id), queryKey: getGetAdminApplicationQueryKey(id) } });
  if (appQuery.isLoading) return <PageLoader label="Opening student record" />;
  if (appQuery.isError || !appQuery.data) return <ErrorState message="This application could not be found or is no longer available." retry={() => appQuery.refetch()} />;
  const app = appQuery.data;
  const boolIcon = (v?: boolean | null) => v ? 'Yes' : 'No';
  return <div className="space-y-7">
    <button data-testid="button-back-applications" onClick={() => setLocation('/admin/applications')} className="fade-up flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowLeft size={15} /> Back to applications</button>
    <section className="fade-up flex flex-col justify-between gap-5 border-b border-[hsl(var(--border))] pb-7 lg:flex-row lg:items-end"><div className="flex items-start gap-4"><div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-xl font-bold text-[hsl(var(--primary-foreground))]">{initials(`${app.firstName} ${app.lastName}`)}</div><div><div className="mb-2 flex flex-wrap items-center gap-3"><p className="nexus-kicker text-[hsl(var(--primary))]">{app.prn}</p><StatusPill status={app.status} /></div><h1 className="nexus-serif text-4xl tracking-tight">{app.firstName} {app.otherNames} {app.lastName}</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{app.email} <span className="mx-2 opacity-40">·</span> {app.phoneNumber}</p></div></div><div className="text-left lg:text-right"><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">Submitted</p><p className="mt-1 text-sm font-semibold">{formatDate(app.submittedAt, true)}</p></div></section>
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><div className="space-y-6">

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><UserRound size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Personal details</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="Full name" value={`${app.firstName} ${app.otherNames} ${app.lastName}`} /><DetailField label="Date of birth" value={formatDate(app.dateOfBirth)} /><DetailField label="Gender" value={app.gender} /><DetailField label="Marital status" value={app.maritalStatus} /><DetailField label="Nationality" value={app.nationality} /><DetailField label="Email" value={app.email} /><DetailField label="Phone" value={app.phoneNumber} /><DetailField label="Email verification" value={boolIcon(app.emailVerified)} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><FileText size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Address & location</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="Address" value={app.address} /><DetailField label="Postal address" value={app.postalAddress} /><DetailField label="City" value={app.city} /><DetailField label="Postal code" value={app.postalCode} /><DetailField label="Country" value={app.country} /><DetailField label="District" value={app.district} /><DetailField label="Subcounty" value={app.subcounty} /><DetailField label="Village" value={app.village} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><ShieldCheck size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Identity & guardian</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="Has national ID or passport" value={app.hasNationalIdOrPassport} /><DetailField label="NIN / passport details" value={app.birthCertificateOrNationalIdDetails} /><DetailField label="Passport photo uploaded" value={boolIcon(app.passportPhotoUploaded)} /><DetailField label="Guardian name" value={app.guardianName} /><DetailField label="Guardian type" value={app.guardianType} /><DetailField label="Guardian phone" value={app.guardianPhone} /><DetailField label="Next of kin relationship" value={app.nextOfKinRelationship} /><DetailField label="Is Ugandan" value={app.isUgandan} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><ClipboardList size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Application info</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="Application type" value={app.applicationType} /><DetailField label="Entry scheme" value={app.entryScheme} /><DetailField label="Start date" value={app.startDate} /><DetailField label="Previous institution" value={app.previousInstitution} /><DetailField label="Highest qualification" value={app.highestQualification} /><DetailField label="Academic credential level" value={app.academicCredentialLevel} /><DetailField label="Credential details" value={app.academicCredentialsDetails} /><DetailField label="Interview preference" value={app.interviewPreference} /><DetailField label="How did you hear" value={app.howDidYouHear} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><BookOpen size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Programme choices</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2"><DetailField label="First choice" value={app.programChoice1} /><DetailField label="Second choice" value={app.programChoice2} /><DetailField label="Third choice" value={app.programChoice3} /><DetailField label="Fourth choice" value={app.programChoice4} /><DetailField label="Study mode" value={app.studyMode} /><DetailField label="Academic year" value={app.academicYear} /><DetailField label="Semester" value={app.semester} /><DetailField label="Assigned programme" value={app.assignedProgramme} /><DetailField label="Weight score" value={app.totalWeightScore != null ? String(app.totalWeightScore) : null} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><FileCheck2 size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">UCE details</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="UCE index number" value={app.uceIndexNumber} /><DetailField label="UCE year of sitting" value={app.uceYearOfSitting} /><DetailField label="UCE second sitting" value={boolIcon(app.uceSecondSitting)} /><DetailField label="UCE second index" value={app.uceSecondIndexNumber} /><DetailField label="UCE second year" value={app.uceSecondYearOfSitting} /><DetailField label="UCE total aggregates" value={app.uceTotalAggregates} /><DetailField label="UCE division" value={app.uceDivision} /><DetailField label="O-Level school" value={app.oLevelSchoolName} /><DetailField label="UCE results" value={app.uceResult} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><BookOpen size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">UACE details</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="UACE index number" value={app.uaceIndexNumber} /><DetailField label="UACE year of sitting" value={app.uaceYearOfSitting} /><DetailField label="UACE second sitting" value={boolIcon(app.uaceSecondSitting)} /><DetailField label="UACE second index" value={app.uaceSecondIndexNumber} /><DetailField label="UACE second year" value={app.uaceSecondYearOfSitting} /><DetailField label="UACE total points" value={app.uaceTotalPoints} /><DetailField label="General paper grade" value={app.uaceGeneralPaperGrade} /><DetailField label="ICT / Subsidiary Math subject" value={app.uaceIctOrSubMathSubject} /><DetailField label="ICT / Subsidiary Math grade" value={app.uaceIctOrSubMathGrade} /><DetailField label="UACE results" value={app.uaceResult} /></div><SubjectTable label="UACE principal subjects" json={app.uacePrincipalSubjects} /></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><BookOpen size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">O-Level & certificate subjects</h2></div><div className="grid gap-x-8 gap-y-6"><DetailField label="GPA" value={app.gpa} /></div><SubjectTable label="O-Level subjects" json={app.oLevelSubjects} /><SubjectTable label="Certificate subjects" json={app.certificateSubjects} /></section>

      {app.qualificationResults && (() => { try { const results = JSON.parse(app.qualificationResults) as QualificationEntry[]; if (!results.length) return null; return <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><GraduationCap size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Qualification breakdown</h2></div><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-bold">Programme</th><th className="px-4 py-3 font-bold">Base Score</th><th className="px-4 py-3 font-bold">Adjusted</th><th className="px-4 py-3 font-bold">Bonus</th><th className="px-4 py-3 font-bold">Cutoff</th><th className="px-4 py-3 font-bold">O-Level</th><th className="px-4 py-3 font-bold">A-Level</th><th className="px-4 py-3 font-bold">Result</th></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]">{results.map((r) => <tr key={r.programmeCode} className="hover:bg-[hsl(var(--muted)/.3)]"><td className="px-4 py-3">{r.programmeName || r.programmeCode}</td><td className="px-4 py-3 font-semibold">{r.totalScore.toFixed(1)}</td><td className="px-4 py-3 font-semibold">{(r.adjustedScore ?? r.totalScore).toFixed(1)}</td><td className="px-4 py-3">{r.genderBonus ? <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(280_65%_55%)]/15 px-2 py-0.5 text-[10px] font-bold text-[hsl(280_65%_55%)]">+1.5</span> : <span className="text-[hsl(var(--muted-foreground))]">-</span>}</td><td className="px-4 py-3">{r.cutoffScore.toFixed(1)}</td><td className="px-4 py-3">{r.oLevelScore.toFixed(1)}</td><td className="px-4 py-3">{r.aLevelScore.toFixed(1)}</td><td className="px-4 py-3">{r.qualified ? <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(160_43%_40%)]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(160_43%_40%)]">Qualified</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--destructive))]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--destructive))]">Below cutoff</span>}</td></tr>)}</tbody></table></div></section>; } catch { return null; } })()}

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><FileText size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Personal statement</h2></div><p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">{app.personalStatement || 'Not provided'}</p></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><Download size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Uploaded documents</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DocumentField label="Passport photo" url={app.passportPhotoUrl} /><DocumentField label="Birth certificate" url={app.birthCertificateUrl} /><DocumentField label="O-Level result slip" url={app.oLevelResultSlipUrl} /><DocumentField label="A-Level result slip" url={app.aLevelResultSlipUrl} /><DocumentField label="Academic transcript" url={app.academicTranscriptUrl} /><DocumentField label="National ID / passport" url={app.nationalIdOrPassportUrl} /><DocumentField label="Country ID document" url={app.countryIdDocumentUrl} /><DocumentField label="Referee letter" url={app.refereeLetterUrl} /><DocumentField label="Personal statement attachment" url={app.personalStatementAttachmentUrl} /></div><div className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="Documents confirmed" value={boolIcon(app.documentsConfirmed)} /><DetailField label="Transcript uploaded" value={boolIcon(app.transcriptUploaded)} /><DetailField label="ID uploaded" value={boolIcon(app.idUploaded)} /><DetailField label="Country ID uploaded" value={boolIcon(app.countryIdUploaded)} /><DetailField label="Recommendation uploaded" value={boolIcon(app.recommendationUploaded)} /><DetailField label="Statement uploaded" value={boolIcon(app.statementUploaded)} /></div></section>

      <section className="nexus-card p-6 md:p-7"><div className="mb-6 flex items-center gap-2"><FileCheck2 size={17} className="text-[hsl(var(--primary))]" /><h2 className="text-base font-bold">Payment & extras</h2></div><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"><DetailField label="Fee paid" value={`${app.feeCurrency || ''} ${app.feePaid ?? 0}`} mono /><DetailField label="Fee required" value={`${app.feeCurrency || ''} ${app.feeRequired ?? 0}`} mono /><DetailField label="Application fee paid" value={boolIcon(app.applicationFeePaid)} /><DetailField label="Payment method" value={app.paymentMethod} /><DetailField label="Payment reference" value={app.paymentReference} /><DetailField label="Terms accepted" value={boolIcon(app.termsAccepted)} /><DetailField label="Additional information" value={app.extras} /></div></section>

    </div><aside className="space-y-6 xl:sticky xl:top-24 xl:self-start"><ReviewPanel app={app} /><SuggestedProgrammeCard app={app} />{app.assignedProgramme && <div className="nexus-card border-l-4 border-l-[hsl(160_43%_40%)] p-5"><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">Assigned programme</p><p className="mt-2 text-sm font-semibold">{app.assignedProgramme}</p>{app.totalWeightScore != null && <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Weight score: {app.totalWeightScore.toFixed(1)}</p>}</div>}<div className="nexus-card p-5"><p className="nexus-kicker text-[hsl(var(--muted-foreground))]">Record trail</p><div className="mt-5 space-y-4 border-l border-[hsl(var(--border))] pl-4"><div className="relative"><span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-[hsl(var(--primary))]" /><p className="text-xs font-semibold">Application created</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{formatDate(app.createdAt, true)}</p></div><div className="relative"><span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-[hsl(var(--accent))]" /><p className="text-xs font-semibold">Last updated</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{formatDate(app.updatedAt, true)}</p></div>{app.reviewedAt && <div className="relative"><span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-[hsl(160_43%_40%)]" /><p className="text-xs font-semibold">Decision recorded</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{formatDate(app.reviewedAt, true)}</p></div>}</div></div></aside></div>
  </div>;
}

function SiteSettingsPage() {
  const settingsQuery = useGetSiteSettings();
  const updateMutation = useUpdateSiteSetting();

  const settings = settingsQuery.data || [];
  const getSetting = (key: string) => settings.find((s) => s.settingKey === key)?.settingValue || '';

  const [portalName, setPortalName] = useState('');
  const [aboutStoryLabel, setAboutStoryLabel] = useState('');
  const [aboutStoryHeading1, setAboutStoryHeading1] = useState('');
  const [aboutStoryHeading2, setAboutStoryHeading2] = useState('');
  const [aboutStoryParagraph, setAboutStoryParagraph] = useState('');
  const [aboutFoundingLabel, setAboutFoundingLabel] = useState('');
  const [aboutFoundingHeading, setAboutFoundingHeading] = useState('');
  const [aboutFoundingStory, setAboutFoundingStory] = useState('');
  const [aboutMissionLabel, setAboutMissionLabel] = useState('');
  const [aboutMissionText, setAboutMissionText] = useState('');
  const [aboutVisionLabel, setAboutVisionLabel] = useState('');
  const [aboutVisionText, setAboutVisionText] = useState('');
  const [aboutValuesLabel, setAboutValuesLabel] = useState('');
  const [aboutValuesHeading, setAboutValuesHeading] = useState('');
  const [aboutProgramsBtn, setAboutProgramsBtn] = useState('');
  const [aboutValues, setAboutValues] = useState<Array<{ title: string; desc: string }>>([]);
  const [aboutCtaLabel, setAboutCtaLabel] = useState('');
  const [aboutCtaHeading, setAboutCtaHeading] = useState('');
  const [aboutCtaDonateBtn, setAboutCtaDonateBtn] = useState('');
  const [aboutCtaPartnerBtn, setAboutCtaPartnerBtn] = useState('');
  const [navLinks, setNavLinks] = useState<Array<{ label: string; href: string; visible: boolean }>>([]);
  const [ctaButtons, setCtaButtons] = useState<Array<{ label: string; href: string; style: string; visible: boolean }>>([]);
  const [splashLogoUrl, setSplashLogoUrl] = useState('');
  const [splashLogoText, setSplashLogoText] = useState('IU');
  const [splashName, setSplashName] = useState('Institute Uganda');
  const [splashMotto, setSplashMotto] = useState('Empowering Through Vocational Skills');
  const [splashStatusText, setSplashStatusText] = useState('Preparing Experience');
  const [heroTagline, setHeroTagline] = useState('');
  const [heroHeading1, setHeroHeading1] = useState('');
  const [heroHeading2, setHeroHeading2] = useState('');
  const [heroHeading3, setHeroHeading3] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCtaDonate, setHeroCtaDonate] = useState('');
  const [heroCtaSponsor, setHeroCtaSponsor] = useState('');
  const [heroCtaDonateVisible, setHeroCtaDonateVisible] = useState(true);
  const [heroCtaSponsorVisible, setHeroCtaSponsorVisible] = useState(true);
  const [heroCtaLearnMore, setHeroCtaLearnMore] = useState('');
  const [heroCtaLearnMoreVisible, setHeroCtaLearnMoreVisible] = useState(true);
  const [heroStats, setHeroStats] = useState<Array<{ value: string; label: string }>>([]);
  const [whatWeTeachTagline, setWhatWeTeachTagline] = useState('');
  const [whatWeTeachHeading1, setWhatWeTeachHeading1] = useState('');
  const [whatWeTeachHeading2, setWhatWeTeachHeading2] = useState('');
  const [whatWeTeachSubtitle, setWhatWeTeachSubtitle] = useState('');
  const [whatWeTeachPrograms, setWhatWeTeachPrograms] = useState<Array<{ title: string; duration: string; outcome: string }>>([]);
  const [whatWeTeachBtnText, setWhatWeTeachBtnText] = useState('');
  const [whatWeTeachBtnVisible, setWhatWeTeachBtnVisible] = useState(true);
  const [successStoryTagline, setSuccessStoryTagline] = useState('');
  const [successStoryQuote, setSuccessStoryQuote] = useState('');
  const [successStoryAuthor, setSuccessStoryAuthor] = useState('');
  const [successStoryProgram, setSuccessStoryProgram] = useState('');
  const [successStoryOutcome, setSuccessStoryOutcome] = useState('');
  const [successStoryBtnText, setSuccessStoryBtnText] = useState('');
  const [successStoryBtnVisible, setSuccessStoryBtnVisible] = useState(true);
  const [successStoryStats, setSuccessStoryStats] = useState<Array<{ val: string; label: string }>>([]);
  const [donateTagline, setDonateTagline] = useState('');
  const [donateHeading1, setDonateHeading1] = useState('');
  const [donateHeading2, setDonateHeading2] = useState('');
  const [donateSubtitle, setDonateSubtitle] = useState('');
  const [donateTiers, setDonateTiers] = useState<Array<{ amount: string; impact: string }>>([]);
  const [donateCtaDonate, setDonateCtaDonate] = useState('');
  const [donateCtaDonateVisible, setDonateCtaDonateVisible] = useState(true);
  const [donateCtaSponsor, setDonateCtaSponsor] = useState('');
  const [donateCtaSponsorVisible, setDonateCtaSponsorVisible] = useState(true);
  const [footerMission, setFooterMission] = useState('');
  const [footerEmail, setFooterEmail] = useState('');
  const [footerPhone, setFooterPhone] = useState('');
  const [footerWhatsappCta, setFooterWhatsappCta] = useState('');
  const [footerAddress, setFooterAddress] = useState('');
  const [newsHeroTagline, setNewsHeroTagline] = useState('');
  const [newsHeroHeading1, setNewsHeroHeading1] = useState('');
  const [newsHeroHeading2, setNewsHeroHeading2] = useState('');
  const [newsEventsTagline, setNewsEventsTagline] = useState('');
  const [newsEventsHeading, setNewsEventsHeading] = useState('');
  const [newsReadMore, setNewsReadMore] = useState('');
  const [newsReadMoreVisible, setNewsReadMoreVisible] = useState(true);
  const [newsFeaturedCategory, setNewsFeaturedCategory] = useState('');
  const [newsFeaturedTitle, setNewsFeaturedTitle] = useState('');
  const [newsFeaturedExcerpt, setNewsFeaturedExcerpt] = useState('');
  const [newsArticles, setNewsArticles] = useState<Array<{ category: string; title: string; excerpt: string }>>([]);
  const [settingEvents, setSettingEvents] = useState<Array<{ title: string; date: string; type: string }>>([]);
  const [progHeroTagline, setProgHeroTagline] = useState('');
  const [progHeroHeading1, setProgHeroHeading1] = useState('');
  const [progHeroHeading2, setProgHeroHeading2] = useState('');
  const [progHeroDescription, setProgHeroDescription] = useState('');
  const [progSectionTagline, setProgSectionTagline] = useState('');
  const [progSectionHeading, setProgSectionHeading] = useState('');
  const [progSectionDescription, setProgSectionDescription] = useState('');
  const [storiesHeroTagline, setStoriesHeroTagline] = useState('');
  const [storiesHeroHeading1, setStoriesHeroHeading1] = useState('');
  const [storiesHeroHeading2, setStoriesHeroHeading2] = useState('');
  const [storiesHeroDescription, setStoriesHeroDescription] = useState('');
  const [storiesSectionTagline, setStoriesSectionTagline] = useState('');
  const [storiesSectionHeading1, setStoriesSectionHeading1] = useState('');
  const [storiesSectionHeading2, setStoriesSectionHeading2] = useState('');
  const [storiesCtaTagline, setStoriesCtaTagline] = useState('');
  const [storiesCtaHeading1, setStoriesCtaHeading1] = useState('');
  const [storiesCtaHeading2, setStoriesCtaHeading2] = useState('');
  const [storiesCtaDescription, setStoriesCtaDescription] = useState('');
  const [storiesCtaBtn1Text, setStoriesCtaBtn1Text] = useState('');
  const [storiesCtaBtn1Visible, setStoriesCtaBtn1Visible] = useState(true);
  const [storiesCtaBtn2Text, setStoriesCtaBtn2Text] = useState('');
  const [storiesCtaBtn2Visible, setStoriesCtaBtn2Visible] = useState(true);
  const [galleryHeroTagline, setGalleryHeroTagline] = useState('');
  const [galleryHeroHeading1, setGalleryHeroHeading1] = useState('');
  const [galleryHeroHeading2, setGalleryHeroHeading2] = useState('');
  const [galleryHeroDescription, setGalleryHeroDescription] = useState('');
  const [impactHeroTagline, setImpactHeroTagline] = useState('');
  const [impactHeroHeading1, setImpactHeroHeading1] = useState('');
  const [impactHeroHeading2, setImpactHeroHeading2] = useState('');
  const [impactHeroDescription, setImpactHeroDescription] = useState('');
  const [impactStatsTagline, setImpactStatsTagline] = useState('');
  const [impactStatsHeading, setImpactStatsHeading] = useState('');
  const [impactStats, setImpactStats] = useState<{value: number; suffix: string; label: string}[]>([]);
  const [impactStoriesTagline, setImpactStoriesTagline] = useState('');
  const [impactStoriesHeading, setImpactStoriesHeading] = useState('');
  const [impactStoriesDescription, setImpactStoriesDescription] = useState('');
  const [impactCtaHeading, setImpactCtaHeading] = useState('');
  const [impactCtaDescription, setImpactCtaDescription] = useState('');
  const [impactCtaBtn1Text, setImpactCtaBtn1Text] = useState('');
  const [impactCtaBtn1Visible, setImpactCtaBtn1Visible] = useState(true);
  const [impactCtaBtn2Text, setImpactCtaBtn2Text] = useState('');
  const [impactCtaBtn2Visible, setImpactCtaBtn2Visible] = useState(true);
  const [partnersHeroTagline, setPartnersHeroTagline] = useState('');
  const [partnersHeroHeading1, setPartnersHeroHeading1] = useState('');
  const [partnersHeroHeading2, setPartnersHeroHeading2] = useState('');
  const [partnersHeroDescription, setPartnersHeroDescription] = useState('');
  const [partnersTypesTagline, setPartnersTypesTagline] = useState('');
  const [partnersTypesHeading1, setPartnersTypesHeading1] = useState('');
  const [partnersTypesHeading2, setPartnersTypesHeading2] = useState('');
  const [partnersStatsTagline, setPartnersStatsTagline] = useState('');
  const [partnersStatsHeading, setPartnersStatsHeading] = useState('');
  const [partnersStatsDescription, setPartnersStatsDescription] = useState('');
  const [partnerTypes, setPartnerTypes] = useState<Array<{ title: string; description: string; benefits: string[] }>>([]);
  const [partnersStats, setPartnersStats] = useState<Array<{ value: string; label: string }>>([]);
  const [partnersCtaTagline, setPartnersCtaTagline] = useState('');
  const [partnersCtaHeading1, setPartnersCtaHeading1] = useState('');
  const [partnersCtaHeading2, setPartnersCtaHeading2] = useState('');
  const [partnersCtaDescription, setPartnersCtaDescription] = useState('');
  const [donateHeroTagline, setDonateHeroTagline] = useState('');
  const [donateHeroHeading1, setDonateHeroHeading1] = useState('');
  const [donateHeroHeading2, setDonateHeroHeading2] = useState('');
  const [donateHeroDescription, setDonateHeroDescription] = useState('');
  const [donateTiersTagline, setDonateTiersTagline] = useState('');
  const [donateTiersHeading, setDonateTiersHeading] = useState('');
  const [donateTiersDescription, setDonateTiersDescription] = useState('');
  const [donateSponsorTagline, setDonateSponsorTagline] = useState('');
  const [donateSponsorHeading, setDonateSponsorHeading] = useState('');
  const [donateSponsorDescription, setDonateSponsorDescription] = useState('');
  const [donateSponsorBenefits, setDonateSponsorBenefits] = useState<string[]>([]);
  const [donateSponsorBtnText, setDonateSponsorBtnText] = useState('');
  const [donateSponsorBtnVisible, setDonateSponsorBtnVisible] = useState(true);
  const [donateFaqTagline, setDonateFaqTagline] = useState('');
  const [donateFaqHeading, setDonateFaqHeading] = useState('');
  const [donateFaqs, setDonateFaqs] = useState<Array<{ q: string; a: string }>>([]);
  const [donatePageTiers, setDonatePageTiers] = useState<Array<{ amount: string; usd: number; label: string; description: string; impact: string; featured?: boolean }>>([]);
  const [donateStatAmount, setDonateStatAmount] = useState('');
  const [donateStatPeriod, setDonateStatPeriod] = useState('');
  const [donateStatText, setDonateStatText] = useState('');
  const [donateStatProgress, setDonateStatProgress] = useState('');
  const [donateStatProgressText, setDonateStatProgressText] = useState('');
  const [donateStatVisible, setDonateStatVisible] = useState(true);
  const [donateNeedLabel, setDonateNeedLabel] = useState('');
  const [donateNeedHeading, setDonateNeedHeading] = useState('');
  const [donateNeedText, setDonateNeedText] = useState('');
  const [donateNeedVisible, setDonateNeedVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'home' | 'about' | 'news' | 'programs' | 'stories' | 'gallery' | 'impact' | 'partners' | 'donate' | 'footer' | 'splash'>('general');

  useEffect(() => {
    if (settings.length > 0 && !loaded) {
      setPortalName(getSetting('portal_name'));
      setAboutStoryLabel(getSetting('about_story_label'));
      setAboutStoryHeading1(getSetting('about_story_heading_1'));
      setAboutStoryHeading2(getSetting('about_story_heading_2'));
      setAboutStoryParagraph(getSetting('about_story_paragraph'));
      setAboutFoundingLabel(getSetting('about_founding_label'));
      setAboutFoundingHeading(getSetting('about_founding_heading'));
      setAboutFoundingStory(getSetting('about_founding_story'));
      setAboutMissionLabel(getSetting('about_mission_label'));
      setAboutMissionText(getSetting('about_mission_text'));
      setAboutVisionLabel(getSetting('about_vision_label'));
      setAboutVisionText(getSetting('about_vision_text'));
      setAboutValuesLabel(getSetting('about_values_label'));
      setAboutValuesHeading(getSetting('about_values_heading'));
      setAboutProgramsBtn(getSetting('about_programs_btn'));
      try { setAboutValues(JSON.parse(getSetting('about_values'))); } catch { setAboutValues([]); }
      setAboutCtaLabel(getSetting('about_cta_label'));
      setAboutCtaHeading(getSetting('about_cta_heading'));
      setAboutCtaDonateBtn(getSetting('about_cta_donate_btn'));
      setAboutCtaPartnerBtn(getSetting('about_cta_partner_btn'));
      try { setNavLinks(JSON.parse(getSetting('nav_links'))); } catch { setNavLinks([]); }
      try { setCtaButtons(JSON.parse(getSetting('cta_buttons'))); } catch { setCtaButtons([]); }
      setSplashLogoUrl(getSetting('splash_logo_url'));
      setSplashLogoText(getSetting('splash_logo_text') || 'IU');
      setSplashName(getSetting('splash_name') || 'Institute Uganda');
      setSplashMotto(getSetting('splash_motto') || 'Empowering Through Vocational Skills');
      setSplashStatusText(getSetting('splash_status_text') || 'Preparing Experience');
      setHeroTagline(getSetting('hero_tagline'));
      setHeroHeading1(getSetting('hero_heading_1'));
      setHeroHeading2(getSetting('hero_heading_2'));
      setHeroHeading3(getSetting('hero_heading_3'));
      setHeroSubtitle(getSetting('hero_subtitle'));
      setHeroCtaDonate(getSetting('hero_cta_donate'));
      setHeroCtaSponsor(getSetting('hero_cta_sponsor'));
      setHeroCtaDonateVisible(getSetting('hero_cta_donate_visible') !== 'false');
      setHeroCtaSponsorVisible(getSetting('hero_cta_sponsor_visible') !== 'false');
      setHeroCtaLearnMore(getSetting('hero_cta_learn_more'));
      setHeroCtaLearnMoreVisible(getSetting('hero_cta_learn_more_visible') !== 'false');
      try { setHeroStats(JSON.parse(getSetting('hero_stats'))); } catch { setHeroStats([]); }
      setWhatWeTeachTagline(getSetting('what_we_teach_tagline'));
      setWhatWeTeachHeading1(getSetting('what_we_teach_heading_1'));
      setWhatWeTeachHeading2(getSetting('what_we_teach_heading_2'));
      setWhatWeTeachSubtitle(getSetting('what_we_teach_subtitle'));
      try { setWhatWeTeachPrograms(JSON.parse(getSetting('what_we_teach_programs'))); } catch { setWhatWeTeachPrograms([]); }
      setWhatWeTeachBtnText(getSetting('what_we_teach_btn_text'));
      setWhatWeTeachBtnVisible(getSetting('what_we_teach_btn_visible') !== 'false');
      setSuccessStoryTagline(getSetting('success_story_tagline'));
      setSuccessStoryQuote(getSetting('success_story_quote'));
      setSuccessStoryAuthor(getSetting('success_story_author'));
      setSuccessStoryProgram(getSetting('success_story_program'));
      setSuccessStoryOutcome(getSetting('success_story_outcome'));
      setSuccessStoryBtnText(getSetting('success_story_btn_text'));
      setSuccessStoryBtnVisible(getSetting('success_story_btn_visible') !== 'false');
      try { setSuccessStoryStats(JSON.parse(getSetting('success_story_stats'))); } catch { setSuccessStoryStats([]); }
      setDonateTagline(getSetting('donate_tagline'));
      setDonateHeading1(getSetting('donate_heading_1'));
      setDonateHeading2(getSetting('donate_heading_2'));
      setDonateSubtitle(getSetting('donate_subtitle'));
      try { setDonateTiers(JSON.parse(getSetting('donate_tiers'))); } catch { setDonateTiers([]); }
      setDonateCtaDonate(getSetting('donate_cta_donate'));
      setDonateCtaDonateVisible(getSetting('donate_cta_donate_visible') !== 'false');
      setDonateCtaSponsor(getSetting('donate_cta_sponsor'));
      setDonateCtaSponsorVisible(getSetting('donate_cta_sponsor_visible') !== 'false');
      setFooterMission(getSetting('footer_mission'));
      setFooterEmail(getSetting('footer_email'));
      setFooterPhone(getSetting('footer_phone'));
      setFooterWhatsappCta(getSetting('footer_whatsapp_cta'));
      setFooterAddress(getSetting('footer_address'));
      setNewsHeroTagline(getSetting('news_hero_tagline'));
      setNewsHeroHeading1(getSetting('news_hero_heading_1'));
      setNewsHeroHeading2(getSetting('news_hero_heading_2'));
      setNewsEventsTagline(getSetting('news_events_tagline'));
      setNewsEventsHeading(getSetting('news_events_heading'));
      setNewsReadMore(getSetting('news_read_more'));
      setNewsReadMoreVisible(getSetting('news_read_more_visible') !== 'false');
      setNewsFeaturedCategory(getSetting('news_featured_category'));
      setNewsFeaturedTitle(getSetting('news_featured_title'));
      setNewsFeaturedExcerpt(getSetting('news_featured_excerpt'));
      try { setNewsArticles(JSON.parse(getSetting('news_articles'))); } catch { setNewsArticles([]); }
      try { setSettingEvents(JSON.parse(getSetting('news_events'))); } catch { setSettingEvents([]); }
      setProgHeroTagline(getSetting('programs_hero_tagline'));
      setProgHeroHeading1(getSetting('programs_hero_heading_1'));
      setProgHeroHeading2(getSetting('programs_hero_heading_2'));
      setProgHeroDescription(getSetting('programs_hero_description'));
      setProgSectionTagline(getSetting('programs_section_tagline'));
      setProgSectionHeading(getSetting('programs_section_heading'));
      setProgSectionDescription(getSetting('programs_section_description'));
      setStoriesHeroTagline(getSetting('stories_hero_tagline'));
      setStoriesHeroHeading1(getSetting('stories_hero_heading_1'));
      setStoriesHeroHeading2(getSetting('stories_hero_heading_2'));
      setStoriesHeroDescription(getSetting('stories_hero_description'));
      setStoriesSectionTagline(getSetting('stories_section_tagline'));
      setStoriesSectionHeading1(getSetting('stories_section_heading_1'));
      setStoriesSectionHeading2(getSetting('stories_section_heading_2'));
      setStoriesCtaTagline(getSetting('stories_cta_tagline'));
      setStoriesCtaHeading1(getSetting('stories_cta_heading_1'));
      setStoriesCtaHeading2(getSetting('stories_cta_heading_2'));
      setStoriesCtaDescription(getSetting('stories_cta_description'));
      setStoriesCtaBtn1Text(getSetting('stories_cta_btn1_text'));
      setStoriesCtaBtn1Visible(getSetting('stories_cta_btn1_visible') !== 'false');
      setStoriesCtaBtn2Text(getSetting('stories_cta_btn2_text'));
      setStoriesCtaBtn2Visible(getSetting('stories_cta_btn2_visible') !== 'false');
      setGalleryHeroTagline(getSetting('gallery_hero_tagline'));
      setGalleryHeroHeading1(getSetting('gallery_hero_heading_1'));
      setGalleryHeroHeading2(getSetting('gallery_hero_heading_2'));
      setGalleryHeroDescription(getSetting('gallery_hero_description'));
      setImpactHeroTagline(getSetting('impact_hero_tagline'));
      setImpactHeroHeading1(getSetting('impact_hero_heading_1'));
      setImpactHeroHeading2(getSetting('impact_hero_heading_2'));
      setImpactHeroDescription(getSetting('impact_hero_description'));
      setImpactStatsTagline(getSetting('impact_stats_tagline'));
      setImpactStatsHeading(getSetting('impact_stats_heading'));
      try { setImpactStats(JSON.parse(getSetting('impact_stats') || '[]')); } catch { setImpactStats([]); }
      setImpactStoriesTagline(getSetting('impact_stories_tagline'));
      setImpactStoriesHeading(getSetting('impact_stories_heading'));
      setImpactStoriesDescription(getSetting('impact_stories_description'));
      setImpactCtaHeading(getSetting('impact_cta_heading'));
      setImpactCtaDescription(getSetting('impact_cta_description'));
      setImpactCtaBtn1Text(getSetting('impact_cta_btn1_text'));
      setImpactCtaBtn1Visible(getSetting('impact_cta_btn1_visible') !== 'false');
      setImpactCtaBtn2Text(getSetting('impact_cta_btn2_text'));
      setImpactCtaBtn2Visible(getSetting('impact_cta_btn2_visible') !== 'false');
      setPartnersHeroTagline(getSetting('partners_hero_tagline'));
      setPartnersHeroHeading1(getSetting('partners_hero_heading_1'));
      setPartnersHeroHeading2(getSetting('partners_hero_heading_2'));
      setPartnersHeroDescription(getSetting('partners_hero_description'));
      setPartnersTypesTagline(getSetting('partners_types_tagline'));
      setPartnersTypesHeading1(getSetting('partners_types_heading_1'));
      setPartnersTypesHeading2(getSetting('partners_types_heading_2'));
      setPartnersStatsTagline(getSetting('partners_stats_tagline'));
      setPartnersStatsHeading(getSetting('partners_stats_heading'));
      setPartnersStatsDescription(getSetting('partners_stats_description'));
      try { setPartnersStats(JSON.parse(getSetting('partners_stats') || '[]')); } catch { setPartnersStats([]); }
      try { setPartnerTypes(JSON.parse(getSetting('partners_partner_types'))); } catch { setPartnerTypes([]); }
      setPartnersCtaTagline(getSetting('partners_cta_tagline'));
      setPartnersCtaHeading1(getSetting('partners_cta_heading_1'));
      setPartnersCtaHeading2(getSetting('partners_cta_heading_2'));
      setPartnersCtaDescription(getSetting('partners_cta_description'));
      setDonateHeroTagline(getSetting('donate_hero_tagline'));
      setDonateHeroHeading1(getSetting('donate_hero_heading_1'));
      setDonateHeroHeading2(getSetting('donate_hero_heading_2'));
      setDonateHeroDescription(getSetting('donate_hero_description'));
      setDonateTiersTagline(getSetting('donate_tiers_tagline'));
      setDonateTiersHeading(getSetting('donate_tiers_heading'));
      setDonateTiersDescription(getSetting('donate_tiers_description'));
      setDonateSponsorTagline(getSetting('donate_sponsor_tagline'));
      setDonateSponsorHeading(getSetting('donate_sponsor_heading'));
      setDonateSponsorDescription(getSetting('donate_sponsor_description'));
      try { setDonateSponsorBenefits(JSON.parse(getSetting('donate_sponsor_benefits'))); } catch { setDonateSponsorBenefits([]); }
      setDonateSponsorBtnText(getSetting('donate_sponsor_btn_text'));
      setDonateSponsorBtnVisible(getSetting('donate_sponsor_btn_visible') !== 'false');
      setDonateFaqTagline(getSetting('donate_faq_tagline'));
      setDonateFaqHeading(getSetting('donate_faq_heading'));
      try { setDonateFaqs(JSON.parse(getSetting('donate_faqs'))); } catch { setDonateFaqs([]); }
      try { setDonatePageTiers(JSON.parse(getSetting('donate_page_tiers') || '[]')); } catch { setDonatePageTiers([]); }
      setDonateStatAmount(getSetting('donate_stat_amount'));
      setDonateStatPeriod(getSetting('donate_stat_period'));
      setDonateStatText(getSetting('donate_stat_text'));
      setDonateStatProgress(getSetting('donate_stat_progress'));
      setDonateStatProgressText(getSetting('donate_stat_progress_text'));
      setDonateStatVisible(getSetting('donate_stat_visible') !== 'false');
      setDonateNeedLabel(getSetting('donate_need_label'));
      setDonateNeedHeading(getSetting('donate_need_heading'));
      setDonateNeedText(getSetting('donate_need_text'));
      setDonateNeedVisible(getSetting('donate_need_visible') !== 'false');
      setLoaded(true);
    }
  }, [settings, loaded]);

  const save = async (key: string, value: string) => {
    await updateMutation.mutateAsync({ settingKey: key, settingValue: value });
    setSaveMsg(`Saved "${key}"`);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  if (settingsQuery.status === 'pending') return <PageLoader label="Loading site settings" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nexus-serif text-2xl font-bold">Site Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Manage content displayed on the public Application Portal.</p>
        </div>
        {saveMsg && <span className="text-sm text-[hsl(160_43%_25%)] font-medium">{saveMsg}</span>}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {[
          { key: 'general' as const, label: 'General', desc: 'Portal name, navigation, CTA buttons' },
          { key: 'splash' as const, label: 'Splash Screen', desc: 'Logo, name & motto on loading screen' },
          { key: 'home' as const, label: 'Home', desc: 'Hero, programs, story, donate sections' },
          { key: 'about' as const, label: 'About', desc: 'About page content' },
          { key: 'news' as const, label: 'News & Events', desc: 'News page hero & events headings' },
          { key: 'programs' as const, label: 'Programs', desc: 'Programs page hero & content' },
          { key: 'stories' as const, label: 'Student Stories', desc: 'Student stories page hero & content' },
          { key: 'impact' as const, label: 'Impact', desc: 'Impact page hero, stats, stories & CTA' },
          { key: 'gallery' as const, label: 'Gallery', desc: 'Photo gallery page hero & content' },
          { key: 'impact' as const, label: 'Impact', desc: 'Impact page hero, stats & content' },
          { key: 'partners' as const, label: 'Partners', desc: 'Partners page hero, ways to partner & CTA' },
          { key: 'donate' as const, label: 'Donate', desc: 'Donate page hero & content' },
          { key: 'footer' as const, label: 'Footer', desc: 'Footer contact & mission' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-[hsl(160_43%_40%)] text-[hsl(160_43%_40%)]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ GENERAL TAB ═══════════════════ */}
      {activeTab === 'general' && (
        <div className="space-y-8 pt-4">
          {/* Portal Name */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Portal Name</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The main name of the university shown in the header logo and footer.</p>
            <div className="flex gap-3">
              <Input value={portalName} onChange={(e) => setPortalName(e.target.value)} className="max-w-md" placeholder="e.g. University Application Portal" />
              <Button onClick={() => save('portal_name', portalName)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="nexus-card rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="nexus-serif text-lg font-semibold">Navigation Links</h2>
              <Button variant="outline" size="sm" onClick={() => setNavLinks([...navLinks, { label: 'New Link', href: '/', visible: true }])}>
                + Add Link
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The menu items in the top navigation bar. Toggle visibility to show/hide each link.</p>
            <div className="space-y-3">
              {navLinks.map((link, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 items-center">
                  <Input value={link.label} onChange={(e) => { const next = [...navLinks]; next[i] = { ...next[i], label: e.target.value }; setNavLinks(next); }} placeholder="Label" />
                  <Input value={link.href} onChange={(e) => { const next = [...navLinks]; next[i] = { ...next[i], href: e.target.value }; setNavLinks(next); }} placeholder="URL" />
                  <button onClick={() => { const next = [...navLinks]; next[i] = { ...next[i], visible: !next[i].visible }; setNavLinks(next); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${link.visible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {link.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button onClick={() => setNavLinks(navLinks.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('nav_links', JSON.stringify(navLinks))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Navigation'}
            </Button>
          </div>

          {/* CTA Buttons */}
          <div className="nexus-card rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="nexus-serif text-lg font-semibold">CTA Buttons</h2>
              <Button variant="outline" size="sm" onClick={() => setCtaButtons([...ctaButtons, { label: 'New Button', href: '/', style: 'outline', visible: true }])}>
                + Add Button
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Call-to-action buttons in the top navigation bar (e.g. "Apply Now", "Donate").</p>
            <div className="space-y-3">
              {ctaButtons.map((btn, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center">
                  <Input value={btn.label} onChange={(e) => { const next = [...ctaButtons]; next[i] = { ...next[i], label: e.target.value }; setCtaButtons(next); }} placeholder="Label" />
                  <Input value={btn.href} onChange={(e) => { const next = [...ctaButtons]; next[i] = { ...next[i], href: e.target.value }; setCtaButtons(next); }} placeholder="URL" />
                  <select value={btn.style} onChange={(e) => { const next = [...ctaButtons]; next[i] = { ...next[i], style: e.target.value }; setCtaButtons(next); }} className="border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent">
                    <option value="accent">Accent</option>
                    <option value="outline">Outline</option>
                  </select>
                  <button onClick={() => { const next = [...ctaButtons]; next[i] = { ...next[i], visible: !next[i].visible }; setCtaButtons(next); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${btn.visible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {btn.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button onClick={() => setCtaButtons(ctaButtons.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('cta_buttons', JSON.stringify(ctaButtons))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Buttons'}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ SPLASH SCREEN TAB ═══════════════════ */}
      {activeTab === 'splash' && (
        <div className="space-y-8 pt-4">
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Splash Screen</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Configure the logo, name, and motto shown on the loading screen.</p>

            {/* Logo Preview */}
            <div className="flex items-center gap-6 mb-6 p-4 rounded-xl bg-[hsl(var(--muted)/.4)]">
              <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center overflow-hidden shrink-0">
                {splashLogoUrl ? (
                  <img src={splashLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-[hsl(var(--primary-foreground))]">{splashLogoText || 'IU'}</span>
                )}
              </div>
              <div>
                <p className="font-heading text-xl font-light uppercase">{splashName || 'Institute Uganda'}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{splashMotto || 'Empowering Through Vocational Skills'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Logo Image</label>
                {splashLogoUrl && <img src={splashLogoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover mb-2" />}
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors text-sm font-medium">
                  <Image size={14} />
                  Choose Logo Image
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch('http://localhost:8080/api/v1/storage/upload', { method: 'POST', body: formData });
                      if (res.ok) {
                        const data = await res.json();
                        const url = data.url || data.fileUrl || '';
                        setSplashLogoUrl(url);
                        save('splash_logo_url', url);
                      }
                    } catch {}
                  }} />
                </label>
                {splashLogoUrl && <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Uploaded ✓</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Logo Fallback Text</label>
                <div className="flex gap-3">
                  <Input value={splashLogoText} onChange={(e) => setSplashLogoText(e.target.value)} className="max-w-md" placeholder="e.g. IU" />
                  <Button onClick={() => save('splash_logo_text', splashLogoText)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Shown inside the circle when no logo image is uploaded.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Institute Name</label>
                <div className="flex gap-3">
                  <Input value={splashName} onChange={(e) => setSplashName(e.target.value)} className="max-w-md" placeholder="e.g. Institute Uganda" />
                  <Button onClick={() => save('splash_name', splashName)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Motto / Tagline</label>
                <div className="flex gap-3">
                  <Input value={splashMotto} onChange={(e) => setSplashMotto(e.target.value)} className="max-w-md" placeholder="e.g. Empowering Through Vocational Skills" />
                  <Button onClick={() => save('splash_motto', splashMotto)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Loading Status Text</label>
                <div className="flex gap-3">
                  <Input value={splashStatusText} onChange={(e) => setSplashStatusText(e.target.value)} className="max-w-md" placeholder="e.g. Preparing Experience" />
                  <Button onClick={() => save('splash_status_text', splashStatusText)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ HOME TAB ═══════════════════ */}
      {activeTab === 'home' && (
        <div className="space-y-8 pt-4">
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Tagline</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Small text with a heart icon above the main heading on the homepage hero section.</p>
        <div className="flex gap-3">
          <Input value={heroTagline} onChange={(e) => setHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Empowering Communities Since 2010" />
          <Button onClick={() => save('hero_tagline', heroTagline)} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
          </Button>
        </div>
      </div>

      {/* Hero Headings */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Headings</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The large main heading on the homepage hero section. Line 2 is shown in accent color.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Line 1</label>
            <div className="flex gap-3">
              <Input value={heroHeading1} onChange={(e) => setHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Empowering Single Mothers" />
              <Button onClick={() => save('hero_heading_1', heroHeading1)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Line 2 <span className="text-accent font-normal">(accent color)</span></label>
            <div className="flex gap-3">
              <Input value={heroHeading2} onChange={(e) => setHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. & Vulnerable Youth" />
              <Button onClick={() => save('hero_heading_2', heroHeading2)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Line 3</label>
            <div className="flex gap-3">
              <Input value={heroHeading3} onChange={(e) => setHeroHeading3(e.target.value)} className="max-w-md" placeholder="e.g. Through Practical Skills" />
              <Button onClick={() => save('hero_heading_3', heroHeading3)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Subtitle */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Subtitle</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The paragraph text below the main heading on the homepage hero section.</p>
        <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. We equip vulnerable youth and single mothers with vocational skills..." />
        <div className="mt-3">
          <Button onClick={() => save('hero_subtitle', heroSubtitle)} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
          </Button>
        </div>
      </div>

      {/* Hero CTA Buttons */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Buttons</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The call-to-action buttons below the hero subtitle. Toggle visibility to show/hide each button.</p>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Primary Button (filled, with heart icon)</label>
              <Input value={heroCtaDonate} onChange={(e) => setHeroCtaDonate(e.target.value)} placeholder="e.g. Donate Now" />
            </div>
            <button onClick={() => { setHeroCtaDonateVisible(!heroCtaDonateVisible); save('hero_cta_donate_visible', String(!heroCtaDonateVisible)); }} className={`mt-5 px-3 py-2 rounded-lg text-xs font-medium border ${heroCtaDonateVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
              {heroCtaDonateVisible ? 'Visible' : 'Hidden'}
            </button>
            <Button className="mt-5" onClick={() => save('hero_cta_donate', heroCtaDonate)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Secondary Button (outlined, with users icon)</label>
              <Input value={heroCtaSponsor} onChange={(e) => setHeroCtaSponsor(e.target.value)} placeholder="e.g. Sponsor a Student" />
            </div>
            <button onClick={() => { setHeroCtaSponsorVisible(!heroCtaSponsorVisible); save('hero_cta_sponsor_visible', String(!heroCtaSponsorVisible)); }} className={`mt-5 px-3 py-2 rounded-lg text-xs font-medium border ${heroCtaSponsorVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
              {heroCtaSponsorVisible ? 'Visible' : 'Hidden'}
            </button>
            <Button className="mt-5" onClick={() => save('hero_cta_sponsor', heroCtaSponsor)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Text Button (with arrow icon)</label>
              <Input value={heroCtaLearnMore} onChange={(e) => setHeroCtaLearnMore(e.target.value)} placeholder="e.g. Learn More" />
            </div>
            <button onClick={() => { setHeroCtaLearnMoreVisible(!heroCtaLearnMoreVisible); save('hero_cta_learn_more_visible', String(!heroCtaLearnMoreVisible)); }} className={`mt-5 px-3 py-2 rounded-lg text-xs font-medium border ${heroCtaLearnMoreVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
              {heroCtaLearnMoreVisible ? 'Visible' : 'Hidden'}
            </button>
            <Button className="mt-5" onClick={() => save('hero_cta_learn_more', heroCtaLearnMore)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="nexus-card rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="nexus-serif text-lg font-semibold">Hero Stats</h2>
          <Button variant="outline" size="sm" onClick={() => setHeroStats([...heroStats, { value: '', label: '' }])}>
            + Add Stat
          </Button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The numbered statistics displayed at the bottom of the hero section.</p>
        <div className="space-y-3">
          {heroStats.map((stat, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-center">
              <Input value={stat.value} onChange={(e) => { const next = [...heroStats]; next[i] = { ...next[i], value: e.target.value }; setHeroStats(next); }} placeholder="e.g. 1,200+" />
              <Input value={stat.label} onChange={(e) => { const next = [...heroStats]; next[i] = { ...next[i], label: e.target.value }; setHeroStats(next); }} placeholder="e.g. Students Trained" />
              <button onClick={() => setHeroStats(heroStats.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={() => save('hero_stats', JSON.stringify(heroStats))} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Stats'}
        </Button>
      </div>

      {/* Programs Section */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Programs Section</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The heading area above the program cards on the homepage.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline (small uppercase text)</label>
            <div className="flex gap-3">
              <Input value={whatWeTeachTagline} onChange={(e) => setWhatWeTeachTagline(e.target.value)} className="max-w-md" placeholder="e.g. What We Teach" />
              <Button onClick={() => save('what_we_teach_tagline', whatWeTeachTagline)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
            <div className="flex gap-3">
              <Input value={whatWeTeachHeading1} onChange={(e) => setWhatWeTeachHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Practical Skills That" />
              <Button onClick={() => save('what_we_teach_heading_1', whatWeTeachHeading1)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
            <div className="flex gap-3">
              <Input value={whatWeTeachHeading2} onChange={(e) => setWhatWeTeachHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Create Real Livelihoods" />
              <Button onClick={() => save('what_we_teach_heading_2', whatWeTeachHeading2)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Subtitle</label>
            <textarea value={whatWeTeachSubtitle} onChange={(e) => setWhatWeTeachSubtitle(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. Our vocational programs are designed for immediate employment..." />
            <div className="mt-2">
              <Button onClick={() => save('what_we_teach_subtitle', whatWeTeachSubtitle)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Programs List */}
      <div className="nexus-card rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="nexus-serif text-lg font-semibold">Program Cards</h2>
          <Button variant="outline" size="sm" onClick={() => setWhatWeTeachPrograms([...whatWeTeachPrograms, { title: '', duration: '', outcome: '' }])}>
            + Add Program
          </Button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The vocational program cards displayed in the "What We Teach" section on the homepage.</p>
        <div className="space-y-3">
          {whatWeTeachPrograms.map((prog, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 items-center">
              <Input value={prog.title} onChange={(e) => { const next = [...whatWeTeachPrograms]; next[i] = { ...next[i], title: e.target.value }; setWhatWeTeachPrograms(next); }} placeholder="e.g. Tailoring & Design" />
              <Input value={prog.duration} onChange={(e) => { const next = [...whatWeTeachPrograms]; next[i] = { ...next[i], duration: e.target.value }; setWhatWeTeachPrograms(next); }} placeholder="e.g. 6 months" />
              <Input value={prog.outcome} onChange={(e) => { const next = [...whatWeTeachPrograms]; next[i] = { ...next[i], outcome: e.target.value }; setWhatWeTeachPrograms(next); }} placeholder="e.g. Run your own shop" />
              <button onClick={() => setWhatWeTeachPrograms(whatWeTeachPrograms.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={() => save('what_we_teach_programs', JSON.stringify(whatWeTeachPrograms))} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Programs'}
        </Button>
      </div>

      {/* Programs Section Button */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Programs Section Button</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The "View All Programs" link with arrow below the program cards.</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md">
            <Input value={whatWeTeachBtnText} onChange={(e) => setWhatWeTeachBtnText(e.target.value)} placeholder="e.g. View All Programs" />
          </div>
          <button onClick={() => { setWhatWeTeachBtnVisible(!whatWeTeachBtnVisible); save('what_we_teach_btn_visible', String(!whatWeTeachBtnVisible)); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${whatWeTeachBtnVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
            {whatWeTeachBtnVisible ? 'Visible' : 'Hidden'}
          </button>
          <Button onClick={() => save('what_we_teach_btn_text', whatWeTeachBtnText)} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
          </Button>
        </div>
      </div>

      {/* Success Story Section */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Success Story Section</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The student success story block on the homepage.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
            <div className="flex gap-3">
              <Input value={successStoryTagline} onChange={(e) => setSuccessStoryTagline(e.target.value)} className="max-w-md" placeholder="e.g. Student Success Story" />
              <Button onClick={() => save('success_story_tagline', successStoryTagline)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Quote</label>
            <textarea value={successStoryQuote} onChange={(e) => setSuccessStoryQuote(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder='e.g. I went from nothing to owning my own business.' />
            <div className="mt-2">
              <Button onClick={() => save('success_story_quote', successStoryQuote)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Author Name</label>
            <div className="flex gap-3">
              <Input value={successStoryAuthor} onChange={(e) => setSuccessStoryAuthor(e.target.value)} className="max-w-md" placeholder="e.g. Mary Nakato" />
              <Button onClick={() => save('success_story_author', successStoryAuthor)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Program</label>
            <div className="flex gap-3">
              <Input value={successStoryProgram} onChange={(e) => setSuccessStoryProgram(e.target.value)} className="max-w-md" placeholder="e.g. Tailoring & Design" />
              <Button onClick={() => save('success_story_program', successStoryProgram)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Outcome (green text)</label>
            <div className="flex gap-3">
              <Input value={successStoryOutcome} onChange={(e) => setSuccessStoryOutcome(e.target.value)} className="max-w-md" placeholder="e.g. Now runs a successful tailoring shop" />
              <Button onClick={() => save('success_story_outcome', successStoryOutcome)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Button</label>
            <div className="flex items-center gap-3">
              <Input value={successStoryBtnText} onChange={(e) => setSuccessStoryBtnText(e.target.value)} className="max-w-md" placeholder="e.g. Read More Stories" />
              <button onClick={() => { setSuccessStoryBtnVisible(!successStoryBtnVisible); save('success_story_btn_visible', String(!successStoryBtnVisible)); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${successStoryBtnVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                {successStoryBtnVisible ? 'Visible' : 'Hidden'}
              </button>
              <Button onClick={() => save('success_story_btn_text', successStoryBtnText)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Story Stats */}
      <div className="nexus-card rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="nexus-serif text-lg font-semibold">Success Story Stats</h2>
          <Button variant="outline" size="sm" onClick={() => setSuccessStoryStats([...successStoryStats, { val: '', label: '' }])}>
            + Add Stat
          </Button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The numbered stats displayed beside the success story on the homepage.</p>
        <div className="space-y-3">
          {successStoryStats.map((stat, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-center">
              <Input value={stat.val} onChange={(e) => { const next = [...successStoryStats]; next[i] = { ...next[i], val: e.target.value }; setSuccessStoryStats(next); }} placeholder="e.g. 1,200+" />
              <Input value={stat.label} onChange={(e) => { const next = [...successStoryStats]; next[i] = { ...next[i], label: e.target.value }; setSuccessStoryStats(next); }} placeholder="e.g. Lives Changed" />
              <button onClick={() => setSuccessStoryStats(successStoryStats.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={() => save('success_story_stats', JSON.stringify(successStoryStats))} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Stats'}
        </Button>
      </div>

      {/* Donate Section */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Donate Section</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The heading area above the donation tier cards on the homepage.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
            <div className="flex gap-3">
              <Input value={donateTagline} onChange={(e) => setDonateTagline(e.target.value)} className="max-w-md" placeholder="e.g. Make A Difference" />
              <Button onClick={() => save('donate_tagline', donateTagline)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
            <div className="flex gap-3">
              <Input value={donateHeading1} onChange={(e) => setDonateHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Your Support Changes" />
              <Button onClick={() => save('donate_heading_1', donateHeading1)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
            <div className="flex gap-3">
              <Input value={donateHeading2} onChange={(e) => setDonateHeading2(e.target.value)} className="max-w-md" placeholder="e.g. A Life" />
              <Button onClick={() => save('donate_heading_2', donateHeading2)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Subtitle</label>
            <textarea value={donateSubtitle} onChange={(e) => setDonateSubtitle(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. Every contribution — large or small..." />
            <div className="mt-2">
              <Button onClick={() => save('donate_subtitle', donateSubtitle)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Donate Tiers */}
      <div className="nexus-card rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="nexus-serif text-lg font-semibold">Donation Tiers</h2>
          <Button variant="outline" size="sm" onClick={() => setDonateTiers([...donateTiers, { amount: '', impact: '' }])}>
            + Add Tier
          </Button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The donation amount cards displayed in the "Make A Difference" section.</p>
        <div className="space-y-3">
          {donateTiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-center">
              <Input value={tier.amount} onChange={(e) => { const next = [...donateTiers]; next[i] = { ...next[i], amount: e.target.value }; setDonateTiers(next); }} placeholder="e.g. $50" />
              <Input value={tier.impact} onChange={(e) => { const next = [...donateTiers]; next[i] = { ...next[i], impact: e.target.value }; setDonateTiers(next); }} placeholder="e.g. Sponsors a student for one month" />
              <button onClick={() => setDonateTiers(donateTiers.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={() => save('donate_tiers', JSON.stringify(donateTiers))} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Tiers'}
        </Button>
      </div>

      {/* Donate Section Buttons */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Donate Section Buttons</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The call-to-action buttons below the donation tier cards. Toggle visibility to show/hide each button.</p>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Primary Button (filled, with heart icon)</label>
              <Input value={donateCtaDonate} onChange={(e) => setDonateCtaDonate(e.target.value)} placeholder="e.g. Donate Now" />
            </div>
            <button onClick={() => { setDonateCtaDonateVisible(!donateCtaDonateVisible); save('donate_cta_donate_visible', String(!donateCtaDonateVisible)); }} className={`mt-5 px-3 py-2 rounded-lg text-xs font-medium border ${donateCtaDonateVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
              {donateCtaDonateVisible ? 'Visible' : 'Hidden'}
            </button>
            <Button className="mt-5" onClick={() => save('donate_cta_donate', donateCtaDonate)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Secondary Button (outlined, with users icon)</label>
              <Input value={donateCtaSponsor} onChange={(e) => setDonateCtaSponsor(e.target.value)} placeholder="e.g. Sponsor a Student" />
            </div>
            <button onClick={() => { setDonateCtaSponsorVisible(!donateCtaSponsorVisible); save('donate_cta_sponsor_visible', String(!donateCtaSponsorVisible)); }} className={`mt-5 px-3 py-2 rounded-lg text-xs font-medium border ${donateCtaSponsorVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
              {donateCtaSponsorVisible ? 'Visible' : 'Hidden'}
            </button>
            <Button className="mt-5" onClick={() => save('donate_cta_sponsor', donateCtaSponsor)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
            </Button>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* ═══════════════════ ABOUT TAB ═══════════════════ */}
      {activeTab === 'about' && (
        <div className="space-y-8 pt-4">
          {/* About Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">About Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Edit content shown on the public About page.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Section Label</label>
                <Input value={aboutStoryLabel} onChange={(e) => setAboutStoryLabel(e.target.value)} placeholder="e.g. Our Story" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Hero Heading — Line 1</label>
                <Input value={aboutStoryHeading1} onChange={(e) => setAboutStoryHeading1(e.target.value)} placeholder="e.g. Built on Hope," />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Hero Heading — Line 2</label>
                <Input value={aboutStoryHeading2} onChange={(e) => setAboutStoryHeading2(e.target.value)} placeholder="e.g. Powered by Purpose" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Hero Paragraph</label>
                <Textarea value={aboutStoryParagraph} onChange={(e) => setAboutStoryParagraph(e.target.value)} rows={4} placeholder="The paragraph shown beneath the hero heading." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Founding Section Label</label>
                <Input value={aboutFoundingLabel} onChange={(e) => setAboutFoundingLabel(e.target.value)} placeholder="e.g. Our Founding Story" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Founding Heading</label>
                <Input value={aboutFoundingHeading} onChange={(e) => setAboutFoundingHeading(e.target.value)} placeholder="e.g. Why We Started" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Founding Story</label>
                <Textarea value={aboutFoundingStory} onChange={(e) => setAboutFoundingStory(e.target.value)} rows={10} placeholder="The full founding story. Separate paragraphs with a blank line." />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Use a blank line between paragraphs. Each paragraph will be rendered as its own block on the page.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Mission Label</label>
                <Input value={aboutMissionLabel} onChange={(e) => setAboutMissionLabel(e.target.value)} placeholder="e.g. Our Mission" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Mission Statement</label>
                <Textarea value={aboutMissionText} onChange={(e) => setAboutMissionText(e.target.value)} rows={3} placeholder="The mission statement text." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Vision Label</label>
                <Input value={aboutVisionLabel} onChange={(e) => setAboutVisionLabel(e.target.value)} placeholder="e.g. Our Vision" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Vision Statement</label>
                <Textarea value={aboutVisionText} onChange={(e) => setAboutVisionText(e.target.value)} rows={3} placeholder="The vision statement text." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Values Section Label</label>
                <Input value={aboutValuesLabel} onChange={(e) => setAboutValuesLabel(e.target.value)} placeholder="e.g. What We Stand For" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Values Heading</label>
                <Input value={aboutValuesHeading} onChange={(e) => setAboutValuesHeading(e.target.value)} placeholder="e.g. Our Core Values" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Programs Button Text</label>
                <Input value={aboutProgramsBtn} onChange={(e) => setAboutProgramsBtn(e.target.value)} placeholder="e.g. See Our Programs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Core Value Cards</label>
                <div className="space-y-3">
                  {aboutValues.map((val, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="grid grid-cols-[1fr_auto] gap-3 mb-2">
                        <Input value={val.title} onChange={(e) => { const next = [...aboutValues]; next[i] = { ...next[i], title: e.target.value }; setAboutValues(next); }} placeholder="Value title" />
                        <button onClick={() => setAboutValues(aboutValues.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs self-center">Remove</button>
                      </div>
                      <Textarea value={val.desc} onChange={(e) => { const next = [...aboutValues]; next[i] = { ...next[i], desc: e.target.value }; setAboutValues(next); }} rows={2} placeholder="Value description" />
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAboutValues([...aboutValues, { title: 'New Value', desc: '' }])}>
                  + Add Value
                </Button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">CTA Section Label</label>
                <Input value={aboutCtaLabel} onChange={(e) => setAboutCtaLabel(e.target.value)} placeholder="e.g. Join Our Mission" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">CTA Heading</label>
                <Input value={aboutCtaHeading} onChange={(e) => setAboutCtaHeading(e.target.value)} placeholder="e.g. Be Part of the Change" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">CTA Donate Button</label>
                <Input value={aboutCtaDonateBtn} onChange={(e) => setAboutCtaDonateBtn(e.target.value)} placeholder="e.g. Donate Now" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">CTA Partner Button</label>
                <Input value={aboutCtaPartnerBtn} onChange={(e) => setAboutCtaPartnerBtn(e.target.value)} placeholder="e.g. Partner With Us" />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                onClick={async () => {
                  await save('about_story_label', aboutStoryLabel);
                  await save('about_story_heading_1', aboutStoryHeading1);
                  await save('about_story_heading_2', aboutStoryHeading2);
                  await save('about_story_paragraph', aboutStoryParagraph);
                  await save('about_founding_label', aboutFoundingLabel);
                  await save('about_founding_heading', aboutFoundingHeading);
                  await save('about_founding_story', aboutFoundingStory);
                  await save('about_mission_label', aboutMissionLabel);
                  await save('about_mission_text', aboutMissionText);
                  await save('about_vision_label', aboutVisionLabel);
                  await save('about_vision_text', aboutVisionText);
                  await save('about_values_label', aboutValuesLabel);
                  await save('about_values_heading', aboutValuesHeading);
                  await save('about_programs_btn', aboutProgramsBtn);
                  await save('about_values', JSON.stringify(aboutValues));
                  await save('about_cta_label', aboutCtaLabel);
                  await save('about_cta_heading', aboutCtaHeading);
                  await save('about_cta_donate_btn', aboutCtaDonateBtn);
                  await save('about_cta_partner_btn', aboutCtaPartnerBtn);
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ NEWS & EVENTS TAB ═══════════════════ */}
      {activeTab === 'news' && (
        <div className="space-y-8 pt-4">
          {/* News Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">News Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The hero banner at the top of the News & Events page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline (small uppercase text)</label>
                <div className="flex gap-3">
                  <Input value={newsHeroTagline} onChange={(e) => setNewsHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. News & Events" />
                  <Button onClick={() => save('news_hero_tagline', newsHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={newsHeroHeading1} onChange={(e) => setNewsHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Stories That" />
                  <Button onClick={() => save('news_hero_heading_1', newsHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={newsHeroHeading2} onChange={(e) => setNewsHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Inspire" />
                  <Button onClick={() => save('news_hero_heading_2', newsHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Events Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Events Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The heading area for upcoming events on the News page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline (small uppercase text)</label>
                <div className="flex gap-3">
                  <Input value={newsEventsTagline} onChange={(e) => setNewsEventsTagline(e.target.value)} className="max-w-md" placeholder="e.g. Upcoming Events" />
                  <Button onClick={() => save('news_events_tagline', newsEventsTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={newsEventsHeading} onChange={(e) => setNewsEventsHeading(e.target.value)} className="max-w-md" placeholder="e.g. Mark Your Calendar" />
                  <Button onClick={() => save('news_events_heading', newsEventsHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* News Grid Articles */}
          <div className="nexus-card rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="nexus-serif text-lg font-semibold">News Grid Articles</h2>
              <Button variant="outline" size="sm" onClick={() => setNewsArticles([...newsArticles, { category: '', title: '', excerpt: '' }])}>
                + Add Article
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The news cards displayed in the grid below the featured article. These override database articles.</p>
            <div className="space-y-4">
              {newsArticles.map((article, i) => (
                <div key={i} className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Article {i + 1}</span>
                    <button onClick={() => setNewsArticles(newsArticles.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input value={article.category} onChange={(e) => { const next = [...newsArticles]; next[i] = { ...next[i], category: e.target.value }; setNewsArticles(next); }} placeholder="Category (e.g. Partnerships)" />
                    <Input value={article.title} onChange={(e) => { const next = [...newsArticles]; next[i] = { ...next[i], title: e.target.value }; setNewsArticles(next); }} placeholder="Title" className="sm:col-span-2" />
                  </div>
                  <textarea value={article.excerpt} onChange={(e) => { const next = [...newsArticles]; next[i] = { ...next[i], excerpt: e.target.value }; setNewsArticles(next); }} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[60px]" placeholder="Excerpt" />
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('news_articles', JSON.stringify(newsArticles))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Articles'}
            </Button>
          </div>

          {/* Featured Article Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Featured Article</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Override the featured news article displayed at the top of the news page. Leave blank to use the first article from the database.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Category Badge</label>
                <div className="flex gap-3">
                  <Input value={newsFeaturedCategory} onChange={(e) => setNewsFeaturedCategory(e.target.value)} className="max-w-md" placeholder="e.g. Partnerships" />
                  <Button onClick={() => save('news_featured_category', newsFeaturedCategory)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Title</label>
                <div className="flex gap-3">
                  <Input value={newsFeaturedTitle} onChange={(e) => setNewsFeaturedTitle(e.target.value)} className="max-w-md" placeholder="e.g. Partnership with MIT Launches Joint Research Program" />
                  <Button onClick={() => save('news_featured_title', newsFeaturedTitle)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Excerpt</label>
                <textarea value={newsFeaturedExcerpt} onChange={(e) => setNewsFeaturedExcerpt(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. A five-year collaboration will support quantum computing research..." />
                <div className="mt-2">
                  <Button onClick={() => save('news_featured_excerpt', newsFeaturedExcerpt)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Read More Link Text</label>
                <div className="flex items-center gap-3">
                  <Input value={newsReadMore} onChange={(e) => setNewsReadMore(e.target.value)} className="max-w-md" placeholder="e.g. Read Full Story" />
                  <button onClick={() => { setNewsReadMoreVisible(!newsReadMoreVisible); save('news_read_more_visible', String(!newsReadMoreVisible)); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${newsReadMoreVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {newsReadMoreVisible ? 'Visible' : 'Hidden'}
                  </button>
                  <Button onClick={() => save('news_read_more', newsReadMore)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ EVENTS LIST ═══════════════════ */}
      {activeTab === 'news' && (
        <div className="space-y-8 pt-4">
          {/* Events Grid */}
          <div className="nexus-card rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="nexus-serif text-lg font-semibold">Events List</h2>
              <Button variant="outline" size="sm" onClick={() => setSettingEvents([...settingEvents, { title: '', date: '', type: '' }])}>
                + Add Event
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The events displayed in the News & Events page grid. These override database events.</p>
            <div className="space-y-4">
              {settingEvents.map((event, i) => (
                <div key={i} className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Event {i + 1}</span>
                    <button onClick={() => setSettingEvents(settingEvents.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input value={event.title} onChange={(e) => { const next = [...settingEvents]; next[i] = { ...next[i], title: e.target.value }; setSettingEvents(next); }} placeholder="Event name (e.g. Alumni Homecoming)" />
                    <Input value={event.date} onChange={(e) => { const next = [...settingEvents]; next[i] = { ...next[i], date: e.target.value }; setSettingEvents(next); }} placeholder="Date (e.g. March 15, 2026 or TBA)" />
                    <Input value={event.type} onChange={(e) => { const next = [...settingEvents]; next[i] = { ...next[i], type: e.target.value }; setSettingEvents(next); }} placeholder="Type (e.g. Alumni, Cultural)" />
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('news_events', JSON.stringify(settingEvents))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Events'}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ PROGRAMS TAB ═══════════════════ */}
      {activeTab === 'programs' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Programs page — "What We Teach".</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={progHeroTagline} onChange={(e) => setProgHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. What We Teach" />
                  <Button onClick={() => save('programs_hero_tagline', progHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={progHeroHeading1} onChange={(e) => setProgHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Vocational Programs" />
                  <Button onClick={() => save('programs_hero_heading_1', progHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={progHeroHeading2} onChange={(e) => setProgHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. That Build Real Futures" />
                  <Button onClick={() => save('programs_hero_heading_2', progHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={progHeroDescription} onChange={(e) => setProgHeroDescription(e.target.value)} className="max-w-md" placeholder="e.g. 8 practical programs. Market-driven curricula..." />
                  <Button onClick={() => save('programs_hero_description', progHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Programs Grid Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Programs Grid Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The section below the hero — "Our Programs" / "Choose Your Path".</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={progSectionTagline} onChange={(e) => setProgSectionTagline(e.target.value)} className="max-w-md" placeholder="e.g. Our Programs" />
                  <Button onClick={() => save('programs_section_tagline', progSectionTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={progSectionHeading} onChange={(e) => setProgSectionHeading(e.target.value)} className="max-w-md" placeholder="e.g. Choose Your Path" />
                  <Button onClick={() => save('programs_section_heading', progSectionHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={progSectionDescription} onChange={(e) => setProgSectionDescription(e.target.value)} className="max-w-md" placeholder="e.g. Click on any program to see skills..." />
                  <Button onClick={() => save('programs_section_description', progSectionDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ STUDENT STORIES TAB ═══════════════════ */}
      {activeTab === 'stories' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Student Stories page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={storiesHeroTagline} onChange={(e) => setStoriesHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Student Stories" />
                  <Button onClick={() => save('stories_hero_tagline', storiesHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={storiesHeroHeading1} onChange={(e) => setStoriesHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Real People." />
                  <Button onClick={() => save('stories_hero_heading_1', storiesHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={storiesHeroHeading2} onChange={(e) => setStoriesHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Real Transformation." />
                  <Button onClick={() => save('stories_hero_heading_2', storiesHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={storiesHeroDescription} onChange={(e) => setStoriesHeroDescription(e.target.value)} className="max-w-md" placeholder="e.g. Behind every statistic is a person..." />
                  <Button onClick={() => save('stories_hero_description', storiesHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stories Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Stories Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The section heading above the student stories list.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={storiesSectionTagline} onChange={(e) => setStoriesSectionTagline(e.target.value)} className="max-w-md" placeholder="e.g. Their Journeys" />
                  <Button onClick={() => save('stories_section_tagline', storiesSectionTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={storiesSectionHeading1} onChange={(e) => setStoriesSectionHeading1(e.target.value)} className="max-w-md" placeholder="e.g. From Hardship" />
                  <Button onClick={() => save('stories_section_heading_1', storiesSectionHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={storiesSectionHeading2} onChange={(e) => setStoriesSectionHeading2(e.target.value)} className="max-w-md" placeholder="e.g. To Hope" />
                  <Button onClick={() => save('stories_section_heading_2', storiesSectionHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Call to Action</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The bottom CTA section of the Student Stories page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={storiesCtaTagline} onChange={(e) => setStoriesCtaTagline(e.target.value)} className="max-w-md" placeholder="e.g. Be Part of the Story" />
                  <Button onClick={() => save('stories_cta_tagline', storiesCtaTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={storiesCtaHeading1} onChange={(e) => setStoriesCtaHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Help Write the Next" />
                  <Button onClick={() => save('stories_cta_heading_1', storiesCtaHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={storiesCtaHeading2} onChange={(e) => setStoriesCtaHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Success Story" />
                  <Button onClick={() => save('stories_cta_heading_2', storiesCtaHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={storiesCtaDescription} onChange={(e) => setStoriesCtaDescription(e.target.value)} className="max-w-md" placeholder="e.g. Every student who walks through our doors..." />
                  <Button onClick={() => save('stories_cta_description', storiesCtaDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Button 1 Text</label>
                  <div className="flex gap-3">
                    <Input value={storiesCtaBtn1Text} onChange={(e) => setStoriesCtaBtn1Text(e.target.value)} className="max-w-md" placeholder="e.g. Sponsor a Student" />
                    <button onClick={() => { setStoriesCtaBtn1Visible(!storiesCtaBtn1Visible); save('stories_cta_btn1_visible', String(!storiesCtaBtn1Visible)); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${storiesCtaBtn1Visible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                      {storiesCtaBtn1Visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Button 2 Text</label>
                  <div className="flex gap-3">
                    <Input value={storiesCtaBtn2Text} onChange={(e) => setStoriesCtaBtn2Text(e.target.value)} className="max-w-md" placeholder="e.g. View Programs" />
                    <button onClick={() => { setStoriesCtaBtn2Visible(!storiesCtaBtn2Visible); save('stories_cta_btn2_visible', String(!storiesCtaBtn2Visible)); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${storiesCtaBtn2Visible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                      {storiesCtaBtn2Visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <Button onClick={() => {
                  save('stories_cta_tagline', storiesCtaTagline);
                  save('stories_cta_heading_1', storiesCtaHeading1);
                  save('stories_cta_heading_2', storiesCtaHeading2);
                  save('stories_cta_description', storiesCtaDescription);
                  save('stories_cta_btn1_text', storiesCtaBtn1Text);
                  save('stories_cta_btn2_text', storiesCtaBtn2Text);
                }} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save CTA'}
                </Button>
              </div>
            </div>
          </div>

          {/* Manage Stories CRUD */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Manage Stories</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Add, edit, or remove student stories displayed on the Stories page.</p>
            <StudentStoriesManager />
          </div>
        </div>
      )}

      {/* ═══════════════════ IMPACT TAB ═══════════════════ */}
      {activeTab === 'impact' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Impact page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={impactHeroTagline} onChange={(e) => setImpactHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Real Transformation" />
                  <Button onClick={() => save('impact_hero_tagline', impactHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={impactHeroHeading1} onChange={(e) => setImpactHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Lives Changed." />
                  <Button onClick={() => save('impact_hero_heading_1', impactHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={impactHeroHeading2} onChange={(e) => setImpactHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Communities Transformed." />
                  <Button onClick={() => save('impact_hero_heading_2', impactHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={impactHeroDescription} onChange={(e) => setImpactHeroDescription(e.target.value)} className="max-w-md" placeholder="e.g. Our graduates are proof..." />
                  <Button onClick={() => save('impact_hero_description', impactHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Stats Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The "Our Impact In Numbers" section heading.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={impactStatsTagline} onChange={(e) => setImpactStatsTagline(e.target.value)} className="max-w-md" placeholder="e.g. By The Numbers" />
                  <Button onClick={() => save('impact_stats_tagline', impactStatsTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={impactStatsHeading} onChange={(e) => setImpactStatsHeading(e.target.value)} className="max-w-md" placeholder="e.g. Our Impact In Numbers" />
                  <Button onClick={() => save('impact_stats_heading', impactStatsHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Stats</label>
                <div className="space-y-2">
                  {impactStats.map((stat, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={stat.value} onChange={(e) => { const v = [...impactStats]; v[i] = {...v[i], value: Number(e.target.value)}; setImpactStats(v); }} className="w-20" placeholder="1200" />
                      <Input value={stat.suffix} onChange={(e) => { const v = [...impactStats]; v[i] = {...v[i], suffix: e.target.value}; setImpactStats(v); }} className="w-14" placeholder="+" />
                      <Input value={stat.label} onChange={(e) => { const v = [...impactStats]; v[i] = {...v[i], label: e.target.value}; setImpactStats(v); }} className="flex-1" placeholder="Label" />
                      <button onClick={() => { const v = impactStats.filter((_, j) => j !== i); setImpactStats(v); }} className="text-red-400 hover:text-red-600 px-1"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button onClick={() => setImpactStats([...impactStats, {value: 0, suffix: '', label: ''}])} className="text-xs text-blue-600 hover:underline">+ Add Stat</button>
                    <button onClick={() => save('impact_stats', JSON.stringify(impactStats))} className="text-xs text-green-600 hover:underline font-medium">Save Stats</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stories Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Stories Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The "Meet Our Graduates" section.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={impactStoriesTagline} onChange={(e) => setImpactStoriesTagline(e.target.value)} className="max-w-md" placeholder="e.g. Graduate Stories" />
                  <Button onClick={() => save('impact_stories_tagline', impactStoriesTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={impactStoriesHeading} onChange={(e) => setImpactStoriesHeading(e.target.value)} className="max-w-md" placeholder="e.g. Meet Our Graduates" />
                  <Button onClick={() => save('impact_stories_heading', impactStoriesHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={impactStoriesDescription} onChange={(e) => setImpactStoriesDescription(e.target.value)} className="max-w-md" placeholder="e.g. Behind every statistic..." />
                  <Button onClick={() => save('impact_stories_description', impactStoriesDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Call to Action</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The bottom CTA section of the Impact page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={impactCtaHeading} onChange={(e) => setImpactCtaHeading(e.target.value)} className="max-w-md" placeholder="e.g. Help Write the Next Success Story" />
                  <Button onClick={() => save('impact_cta_heading', impactCtaHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={impactCtaDescription} onChange={(e) => setImpactCtaDescription(e.target.value)} className="max-w-md" placeholder="e.g. Your donation directly funds..." />
                  <Button onClick={() => save('impact_cta_description', impactCtaDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Button 1 Text</label>
                <div className="flex gap-3">
                  <Input value={impactCtaBtn1Text} onChange={(e) => setImpactCtaBtn1Text(e.target.value)} onBlur={() => save('impact_cta_btn1_text', impactCtaBtn1Text)} className="max-w-md" placeholder="e.g. Donate Now" />
                  <button onClick={() => { setImpactCtaBtn1Visible(!impactCtaBtn1Visible); save('impact_cta_btn1_visible', String(!impactCtaBtn1Visible)); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${impactCtaBtn1Visible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {impactCtaBtn1Visible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Button 2 Text</label>
                <div className="flex gap-3">
                  <Input value={impactCtaBtn2Text} onChange={(e) => setImpactCtaBtn2Text(e.target.value)} onBlur={() => save('impact_cta_btn2_text', impactCtaBtn2Text)} className="max-w-md" placeholder="e.g. Sponsor a Student" />
                  <button onClick={() => { setImpactCtaBtn2Visible(!impactCtaBtn2Visible); save('impact_cta_btn2_visible', String(!impactCtaBtn2Visible)); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${impactCtaBtn2Visible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {impactCtaBtn2Visible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ GALLERY TAB ═══════════════════ */}
      {activeTab === 'gallery' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Photo Gallery page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={galleryHeroTagline} onChange={(e) => setGalleryHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Photo Gallery" />
                  <Button onClick={() => save('gallery_hero_tagline', galleryHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={galleryHeroHeading1} onChange={(e) => setGalleryHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. See the Impact" />
                  <Button onClick={() => save('gallery_hero_heading_1', galleryHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={galleryHeroHeading2} onChange={(e) => setGalleryHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. In Action" />
                  <Button onClick={() => save('gallery_hero_heading_2', galleryHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={galleryHeroDescription} onChange={(e) => setGalleryHeroDescription(e.target.value)} className="max-w-md" placeholder="e.g. Photos from our training sessions..." />
                  <Button onClick={() => save('gallery_hero_description', galleryHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Manage Photos */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Photo Gallery</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Add, edit, or remove photos displayed on the Gallery page.</p>
            <PhotoGalleryManager />
          </div>
        </div>
      )}

      {/* ═══════════════════ IMPACT TAB ═══════════════════ */}
      {activeTab === 'impact' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Impact page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={impactHeroTagline} onChange={(e) => setImpactHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Real Transformation" />
                  <Button onClick={() => save('impact_hero_tagline', impactHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={impactHeroHeading1} onChange={(e) => setImpactHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Lives Changed." />
                  <Button onClick={() => save('impact_hero_heading_1', impactHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={impactHeroHeading2} onChange={(e) => setImpactHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Communities Transformed." />
                  <Button onClick={() => save('impact_hero_heading_2', impactHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={impactHeroDescription} onChange={(e) => setImpactHeroDescription(e.target.value)} className="max-w-md" placeholder="e.g. Our graduates are proof that practical skills..." />
                  <Button onClick={() => save('impact_hero_description', impactHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Impact Stats</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The numbered stats displayed on the Impact page.</p>
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Tagline</label>
                <div className="flex gap-3">
                  <Input value={impactStatsTagline} onChange={(e) => setImpactStatsTagline(e.target.value)} className="max-w-md" placeholder="e.g. By The Numbers" />
                  <Button onClick={() => save('impact_stats_tagline', impactStatsTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Heading</label>
                <div className="flex gap-3">
                  <Input value={impactStatsHeading} onChange={(e) => setImpactStatsHeading(e.target.value)} className="max-w-md" placeholder="e.g. Our Impact In Numbers" />
                  <Button onClick={() => save('impact_stats_heading', impactStatsHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">Stats</h3>
              <Button variant="outline" size="sm" onClick={() => setImpactStats([...impactStats, { value: 0, suffix: '', label: '' }])}>
                + Add Stat
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Each stat shows an animated count-up on the Impact page.</p>
            <div className="space-y-3">
              {impactStats.map((stat, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_1fr_auto] gap-3 items-center">
                  <Input type="number" value={stat.value} onChange={(e) => { const next = [...impactStats]; next[i] = { ...next[i], value: Number(e.target.value) || 0 }; setImpactStats(next); }} placeholder="e.g. 1200" />
                  <Input value={stat.suffix} onChange={(e) => { const next = [...impactStats]; next[i] = { ...next[i], suffix: e.target.value }; setImpactStats(next); }} placeholder="+  %" />
                  <Input value={stat.label} onChange={(e) => { const next = [...impactStats]; next[i] = { ...next[i], label: e.target.value }; setImpactStats(next); }} placeholder="e.g. Total Graduates" />
                  <button onClick={() => setImpactStats(impactStats.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('impact_stats', JSON.stringify(impactStats))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Stats'}
            </Button>
          </div>

          {/* Stories Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Graduate Stories Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Heading and intro text above the graduate story cards on the Impact page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Tagline</label>
                <div className="flex gap-3">
                  <Input value={impactStoriesTagline} onChange={(e) => setImpactStoriesTagline(e.target.value)} className="max-w-md" placeholder="e.g. Graduate Stories" />
                  <Button onClick={() => save('impact_stories_tagline', impactStoriesTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Heading</label>
                <div className="flex gap-3">
                  <Input value={impactStoriesHeading} onChange={(e) => setImpactStoriesHeading(e.target.value)} className="max-w-md" placeholder="e.g. Meet Our Graduates" />
                  <Button onClick={() => save('impact_stories_heading', impactStoriesHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Description</label>
                <div className="flex gap-3">
                  <Input value={impactStoriesDescription} onChange={(e) => setImpactStoriesDescription(e.target.value)} className="max-w-md" placeholder="e.g. Behind every statistic is a real person..." />
                  <Button onClick={() => save('impact_stories_description', impactStoriesDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Call To Action</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The donation call-to-action banner at the bottom of the Impact page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={impactCtaHeading} onChange={(e) => setImpactCtaHeading(e.target.value)} className="max-w-md" placeholder="e.g. Help Write the Next Success Story" />
                  <Button onClick={() => save('impact_cta_heading', impactCtaHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={impactCtaDescription} onChange={(e) => setImpactCtaDescription(e.target.value)} className="max-w-md" placeholder="e.g. Your donation directly funds..." />
                  <Button onClick={() => save('impact_cta_description', impactCtaDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ PARTNERS TAB ═══════════════════ */}
      {activeTab === 'partners' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Partners page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={partnersHeroTagline} onChange={(e) => setPartnersHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Partnerships" />
                  <Button onClick={() => save('partners_hero_tagline', partnersHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={partnersHeroHeading1} onChange={(e) => setPartnersHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Together We Build" />
                  <Button onClick={() => save('partners_hero_heading_1', partnersHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={partnersHeroHeading2} onChange={(e) => setPartnersHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Stronger Futures" />
                  <Button onClick={() => save('partners_hero_heading_2', partnersHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={partnersHeroDescription} onChange={(e) => setPartnersHeroDescription(e.target.value)} className="max-w-md" placeholder="e.g. Our partners make transformation possible..." />
                  <Button onClick={() => save('partners_hero_description', partnersHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Ways to Partner Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Ways to Partner Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Heading and intro text above the partner type cards.</p>
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Tagline</label>
                <div className="flex gap-3">
                  <Input value={partnersTypesTagline} onChange={(e) => setPartnersTypesTagline(e.target.value)} className="max-w-md" placeholder="e.g. Ways to Partner" />
                  <Button onClick={() => save('partners_types_tagline', partnersTypesTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={partnersTypesHeading1} onChange={(e) => setPartnersTypesHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Find Your Way" />
                  <Button onClick={() => save('partners_types_heading_1', partnersTypesHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={partnersTypesHeading2} onChange={(e) => setPartnersTypesHeading2(e.target.value)} className="max-w-md" placeholder="e.g. To Make an Impact" />
                  <Button onClick={() => save('partners_types_heading_2', partnersTypesHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">Partner Type Cards</h3>
              <Button variant="outline" size="sm" onClick={() => setPartnerTypes([...partnerTypes, { title: '', description: '', benefits: [] }])}>
                + Add Partner Type
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The cards under "Ways to Partner". Each has a title, description and benefit list.</p>
            <div className="space-y-6">
              {partnerTypes.map((pt, i) => (
                <div key={i} className="border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Partner Type {i + 1}</span>
                    <button onClick={() => setPartnerTypes(partnerTypes.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Title</label>
                    <Input value={pt.title} onChange={(e) => { const next = [...partnerTypes]; next[i] = { ...next[i], title: e.target.value }; setPartnerTypes(next); }} placeholder="e.g. Corporate Sponsors" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                    <Input value={pt.description} onChange={(e) => { const next = [...partnerTypes]; next[i] = { ...next[i], description: e.target.value }; setPartnerTypes(next); }} placeholder="Describe this partner type" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Benefits (one per line)</label>
                    <textarea value={(pt.benefits || []).join('\n')} onChange={(e) => { const next = [...partnerTypes]; next[i] = { ...next[i], benefits: e.target.value.split('\n').filter((b) => b.trim() !== '') }; setPartnerTypes(next); }} placeholder={'Tax-deductible contributions\nBrand visibility'} rows={3} className="w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(160_43%_40%)]" />
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('partners_partner_types', JSON.stringify(partnerTypes))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Partner Types'}
            </Button>
          </div>

          {/* Current Partners Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Current Partners Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Heading above the grid of current partner logos.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Tagline</label>
                <div className="flex gap-3">
                  <Input value={partnersStatsTagline} onChange={(e) => setPartnersStatsTagline(e.target.value)} className="max-w-md" placeholder="e.g. Our Network" />
                  <Button onClick={() => save('partners_stats_tagline', partnersStatsTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Heading</label>
                <div className="flex gap-3">
                  <Input value={partnersStatsHeading} onChange={(e) => setPartnersStatsHeading(e.target.value)} className="max-w-md" placeholder="e.g. Current Partners" />
                  <Button onClick={() => save('partners_stats_heading', partnersStatsHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Section Description</label>
                <div className="flex gap-3">
                  <Input value={partnersStatsDescription} onChange={(e) => setPartnersStatsDescription(e.target.value)} className="max-w-md" placeholder="e.g. We are grateful to work with..." />
                  <Button onClick={() => save('partners_stats_description', partnersStatsDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-1 mt-6">
              <h3 className="text-sm font-semibold">Stats</h3>
              <Button variant="outline" size="sm" onClick={() => setPartnersStats([...partnersStats, { value: '', label: '' }])}>
                + Add Stat
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The numbered stats at the top of the Partners page (e.g. Active Partners, Funds Mobilised).</p>
            <div className="space-y-3">
              {partnersStats.map((stat, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <Input value={stat.value} onChange={(e) => { const next = [...partnersStats]; next[i] = { ...next[i], value: e.target.value }; setPartnersStats(next); }} placeholder="e.g. $240K" />
                  <Input value={stat.label} onChange={(e) => { const next = [...partnersStats]; next[i] = { ...next[i], label: e.target.value }; setPartnersStats(next); }} placeholder="e.g. Funds Mobilised" />
                  <button onClick={() => setPartnersStats(partnersStats.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('partners_stats', JSON.stringify(partnersStats))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Stats'}
            </Button>
          </div>

          {/* CTA Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Call To Action</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The banner at the bottom of the Partners page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={partnersCtaTagline} onChange={(e) => setPartnersCtaTagline(e.target.value)} className="max-w-md" placeholder="e.g. Become a Partner" />
                  <Button onClick={() => save('partners_cta_tagline', partnersCtaTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={partnersCtaHeading1} onChange={(e) => setPartnersCtaHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Ready to Change Lives" />
                  <Button onClick={() => save('partners_cta_heading_1', partnersCtaHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={partnersCtaHeading2} onChange={(e) => setPartnersCtaHeading2(e.target.value)} className="max-w-md" placeholder="e.g. Together?" />
                  <Button onClick={() => save('partners_cta_heading_2', partnersCtaHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <div className="flex gap-3">
                  <Input value={partnersCtaDescription} onChange={(e) => setPartnersCtaDescription(e.target.value)} className="max-w-md" placeholder="e.g. Whether you represent a corporation, an NGO..." />
                  <Button onClick={() => save('partners_cta_description', partnersCtaDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Manage Partners CRUD */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Manage Partners</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Add, edit, or remove partner organisations displayed on the Partners page.</p>
            <PartnersManager />
          </div>
        </div>
      )}

      {/* ═══════════════════ DONATE TAB ═══════════════════ */}
      {activeTab === 'donate' && (
        <div className="space-y-8 pt-4">
          {/* Hero Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Hero Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The top banner of the Donate page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={donateHeroTagline} onChange={(e) => setDonateHeroTagline(e.target.value)} className="max-w-md" placeholder="e.g. Make A Difference" />
                  <Button onClick={() => save('donate_hero_tagline', donateHeroTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 1</label>
                <div className="flex gap-3">
                  <Input value={donateHeroHeading1} onChange={(e) => setDonateHeroHeading1(e.target.value)} className="max-w-md" placeholder="e.g. Your Gift Builds" />
                  <Button onClick={() => save('donate_hero_heading_1', donateHeroHeading1)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading Line 2</label>
                <div className="flex gap-3">
                  <Input value={donateHeroHeading2} onChange={(e) => setDonateHeroHeading2(e.target.value)} className="max-w-md" placeholder="e.g. A Better Tomorrow" />
                  <Button onClick={() => save('donate_hero_heading_2', donateHeroHeading2)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <textarea value={donateHeroDescription} onChange={(e) => setDonateHeroDescription(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. One donation. One student. One family lifted out of poverty..." />
                <div className="mt-2">
                  <Button onClick={() => save('donate_hero_description', donateHeroDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tiers Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Tiers Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The heading area above the donation tier cards.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={donateTiersTagline} onChange={(e) => setDonateTiersTagline(e.target.value)} className="max-w-md" placeholder="e.g. Choose Your Level" />
                  <Button onClick={() => save('donate_tiers_tagline', donateTiersTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={donateTiersHeading} onChange={(e) => setDonateTiersHeading(e.target.value)} className="max-w-md" placeholder="e.g. Every Amount Makes an Impact" />
                  <Button onClick={() => save('donate_tiers_heading', donateTiersHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <textarea value={donateTiersDescription} onChange={(e) => setDonateTiersDescription(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. All donations go directly to student training, materials, and support..." />
                <div className="mt-2">
                  <Button onClick={() => save('donate_tiers_description', donateTiersDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Donation Tiers */}
          <div className="nexus-card rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="nexus-serif text-lg font-semibold">Donation Tier Cards</h2>
              <Button variant="outline" size="sm" onClick={() => setDonatePageTiers([...donatePageTiers, { amount: '', usd: 50, label: '', description: '', impact: '', featured: false }])}>
                + Add Tier
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The donation amount cards with label, description and impact.</p>
            <div className="space-y-3">
              {donatePageTiers.map((tier, i) => (
                <div key={i} className="border border-[hsl(var(--border))] rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input value={tier.amount} onChange={(e) => { const next = [...donatePageTiers]; next[i] = { ...next[i], amount: e.target.value }; setDonatePageTiers(next); }} placeholder="e.g. $10" />
                    <Input type="number" value={tier.usd} onChange={(e) => { const next = [...donatePageTiers]; next[i] = { ...next[i], usd: Number(e.target.value) }; setDonatePageTiers(next); }} placeholder="e.g. 10" />
                    <button onClick={() => setDonatePageTiers(donatePageTiers.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                  </div>
                  <Input value={tier.label} onChange={(e) => { const next = [...donatePageTiers]; next[i] = { ...next[i], label: e.target.value }; setDonatePageTiers(next); }} placeholder="e.g. Learning Materials" />
                  <Input value={tier.description} onChange={(e) => { const next = [...donatePageTiers]; next[i] = { ...next[i], description: e.target.value }; setDonatePageTiers(next); }} placeholder="e.g. Provides one student with notebooks, pens..." />
                  <Input value={tier.impact} onChange={(e) => { const next = [...donatePageTiers]; next[i] = { ...next[i], impact: e.target.value }; setDonatePageTiers(next); }} placeholder="e.g. Learning materials for 1 student" />
                  <label className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!tier.featured}
                      onChange={(e) => { const next = donatePageTiers.map((t, j) => ({ ...t, featured: j === i ? e.target.checked : false })); setDonatePageTiers(next); }}
                    />
                    Mark as Most Popular (only one)
                  </label>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => save('donate_page_tiers', JSON.stringify(donatePageTiers))} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Tiers'}
            </Button>
          </div>

          {/* Sponsor a Student Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Sponsor a Student Section</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The "Personal Impact" section that promotes student sponsorship.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={donateSponsorTagline} onChange={(e) => setDonateSponsorTagline(e.target.value)} className="max-w-md" placeholder="e.g. Personal Impact" />
                  <Button onClick={() => save('donate_sponsor_tagline', donateSponsorTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={donateSponsorHeading} onChange={(e) => setDonateSponsorHeading(e.target.value)} className="max-w-md" placeholder="e.g. Sponsor a Student Directly" />
                  <Button onClick={() => save('donate_sponsor_heading', donateSponsorHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
                <textarea value={donateSponsorDescription} onChange={(e) => setDonateSponsorDescription(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[60px]" placeholder="e.g. Through our Sponsor a Student program, you are matched with a specific student..." />
                <div className="mt-2">
                  <Button onClick={() => save('donate_sponsor_description', donateSponsorDescription)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Benefits (one per line)</label>
                <textarea value={donateSponsorBenefits.join('\n')} onChange={(e) => setDonateSponsorBenefits(e.target.value.split('\n').filter(Boolean))} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[100px]" placeholder="e.g. A profile and story of the student you're supporting" />
                <div className="mt-2">
                  <Button onClick={() => save('donate_sponsor_benefits', JSON.stringify(donateSponsorBenefits))} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Benefits'}
                  </Button>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-md">
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Button Text</label>
                  <Input value={donateSponsorBtnText} onChange={(e) => setDonateSponsorBtnText(e.target.value)} placeholder="e.g. Start Sponsoring" />
                </div>
                <Button onClick={() => save('donate_sponsor_btn_text', donateSponsorBtnText)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Show button</span>
                <button onClick={() => { setDonateSponsorBtnVisible(!donateSponsorBtnVisible); save('donate_sponsor_btn_visible', String(!donateSponsorBtnVisible)); }} className={`mt-5 px-3 py-2 rounded-lg text-xs font-medium border ${donateSponsorBtnVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                  {donateSponsorBtnVisible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            </div>
          </div>

          {/* Sponsor Stats */}
          <div className="nexus-card rounded-2xl border p-6">
            <h2 className="nexus-serif text-lg font-semibold mb-1">Sponsor Stats</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The two cards beside the "Sponsor a Student" section.</p>
            <div className="space-y-4">
              <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Monthly Sponsorship Banner</span>
                  <button onClick={() => { setDonateStatVisible(!donateStatVisible); save('donate_stat_visible', String(!donateStatVisible)); }} className={`px-3 py-1 rounded-lg text-xs font-medium border ${donateStatVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {donateStatVisible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Amount</label>
                    <Input value={donateStatAmount} onChange={(e) => setDonateStatAmount(e.target.value)} placeholder="e.g. $50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Period</label>
                    <Input value={donateStatPeriod} onChange={(e) => setDonateStatPeriod(e.target.value)} placeholder="e.g. /month" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Text</label>
                  <Input value={donateStatText} onChange={(e) => setDonateStatText(e.target.value)} placeholder="e.g. Sponsors one student for a month" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Fill %</label>
                    <Input value={donateStatProgress} onChange={(e) => setDonateStatProgress(e.target.value)} placeholder="e.g. 68" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Progress text</label>
                    <Input value={donateStatProgressText} onChange={(e) => setDonateStatProgressText(e.target.value)} placeholder="e.g. 68% of monthly spots filled" />
                  </div>
                </div>
                <div className="pt-1">
                  <Button onClick={() => { save('donate_stat_amount', donateStatAmount); save('donate_stat_period', donateStatPeriod); save('donate_stat_text', donateStatText); save('donate_stat_progress', donateStatProgress); save('donate_stat_progress_text', donateStatProgressText); }} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Banner'}
                  </Button>
                </div>
              </div>

              <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Current Need Banner</span>
                  <button onClick={() => { setDonateNeedVisible(!donateNeedVisible); save('donate_need_visible', String(!donateNeedVisible)); }} className={`px-3 py-1 rounded-lg text-xs font-medium border ${donateNeedVisible ? 'bg-[hsl(160_35%_85%)] text-[hsl(160_43%_25%)]' : 'bg-[hsl(40_19%_91%)] text-[hsl(var(--muted-foreground))]'}`}>
                    {donateNeedVisible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Label</label>
                  <Input value={donateNeedLabel} onChange={(e) => setDonateNeedLabel(e.target.value)} placeholder="e.g. Current Need" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                  <Input value={donateNeedHeading} onChange={(e) => setDonateNeedHeading(e.target.value)} placeholder="e.g. 47 students awaiting sponsorship" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Text</label>
                  <textarea value={donateNeedText} onChange={(e) => setDonateNeedText(e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[60px]" placeholder="e.g. These students are enrolled and ready to start..." />
                </div>
                <div className="pt-1">
                  <Button onClick={() => { save('donate_need_label', donateNeedLabel); save('donate_need_heading', donateNeedHeading); save('donate_need_text', donateNeedText); }} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Banner'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="nexus-card rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="nexus-serif text-lg font-semibold">FAQ Section</h2>
              <Button variant="outline" size="sm" onClick={() => setDonateFaqs([...donateFaqs, { q: '', a: '' }])}>
                + Add Question
              </Button>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Admin sets the questions and answers shown on the Donate page.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tagline</label>
                <div className="flex gap-3">
                  <Input value={donateFaqTagline} onChange={(e) => setDonateFaqTagline(e.target.value)} className="max-w-md" placeholder="e.g. Questions" />
                  <Button onClick={() => save('donate_faq_tagline', donateFaqTagline)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Heading</label>
                <div className="flex gap-3">
                  <Input value={donateFaqHeading} onChange={(e) => setDonateFaqHeading(e.target.value)} className="max-w-md" placeholder="e.g. Frequently Asked Questions" />
                  <Button onClick={() => save('donate_faq_heading', donateFaqHeading)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {donateFaqs.map((faq, i) => (
                  <div key={i} className="border border-[hsl(var(--border))] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Question {i + 1}</span>
                      <button onClick={() => setDonateFaqs(donateFaqs.filter((_, j) => j !== i))} className="text-[hsl(var(--destructive))] text-xs">Remove</button>
                    </div>
                    <Input value={faq.q} onChange={(e) => { const next = [...donateFaqs]; next[i] = { ...next[i], q: e.target.value }; setDonateFaqs(next); }} placeholder="e.g. How is my donation used?" />
                    <textarea value={faq.a} onChange={(e) => { const next = [...donateFaqs]; next[i] = { ...next[i], a: e.target.value }; setDonateFaqs(next); }} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[60px]" placeholder="e.g. 100% of your donation goes directly to student training..." />
                  </div>
                ))}
              </div>
              <Button className="mt-4" onClick={() => save('donate_faqs', JSON.stringify(donateFaqs))} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save FAQs'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ FOOTER TAB ═══════════════════ */}
      {activeTab === 'footer' && (
        <div className="space-y-8 pt-4">
      {/* Footer Section */}
      <div className="nexus-card rounded-2xl border p-6">
        <h2 className="nexus-serif text-lg font-semibold mb-1">Footer</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Content displayed in the site footer.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Mission Statement</label>
            <textarea value={footerMission} onChange={(e) => setFooterMission(e.target.value)} className="w-full max-w-md border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[80px]" placeholder="e.g. Empowering single mothers and vulnerable youth..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Contact Email</label>
              <input value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="e.g. info@university.ac.ug" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Phone Number</label>
              <input value={footerPhone} onChange={(e) => setFooterPhone(e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="e.g. +256 700 000 000" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">WhatsApp Button Text</label>
              <input value={footerWhatsappCta} onChange={(e) => setFooterWhatsappCta(e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="e.g. WhatsApp Us" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Address</label>
              <input value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="e.g. Plot 7, Nakawa Road, Kampala" />
            </div>
          </div>
          <div>
            <Button onClick={() => {
              save('footer_mission', footerMission);
              save('footer_email', footerEmail);
              save('footer_phone', footerPhone);
              save('footer_whatsapp_cta', footerWhatsappCta);
              save('footer_address', footerAddress);
            }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save Footer'}
            </Button>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

import ProgramsPage from './pages/ProgramsPage';
import CategoriesPage from './pages/CategoriesPage';

function HomeRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(localStorage.getItem('nap_admin_token') ? '/admin' : '/admin/login'); }, [setLocation]);
  return <PageLoader label="Opening Nexus admissions" />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function StudentStoriesManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['admin-student-stories'],
    queryFn: () => customFetch<Record<string, string>[]>(`${NAD_API}/api/v1/admin/student-stories`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`${NAD_API}/api/v1/admin/student-stories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-student-stories'] }),
  });

  const handleUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:8080/api/v1/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url || data.fileUrl || null;
    } catch { return null; }
  };

  if (showForm) {
    return <StudentStoryForm story={editing} onClose={() => { setShowForm(false); setEditing(null); }} onUpload={handleUpload} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><span className="mr-1">+</span> Add Story</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
      ) : stories.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">No student stories yet.</p>
      ) : (
        <div className="space-y-2">
          {stories.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.3)] transition-colors">
              {s.imageUrl && <img src={s.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.title || 'Untitled'}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{s.studentName || s.author || 'Unknown'}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setShowForm(true); }}><span className="sr-only">Edit</span></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this story?')) deleteMutation.mutate(Number(s.id)); }} className="text-red-500 hover:text-red-600"><span className="sr-only">Delete</span></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentStoryForm({ story, onClose, onUpload }: { story: Record<string, string> | null; onClose: () => void; onUpload: (file: File) => Promise<string | null> }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: story?.title || '', slug: story?.slug || '', content: story?.content || '',
    studentName: story?.studentName || '', author: story?.author || '',
    program: story?.program || '', graduationYear: story?.graduationYear || '',
    imageUrl: story?.imageUrl || '', featured: story?.featured === 'true',
  });
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const body = { ...data, featured: String(data.featured) };
      if (story?.id) return customFetch(`${NAD_API}/api/v1/admin/student-stories/${story.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return customFetch(`${NAD_API}/api/v1/admin/student-stories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-student-stories'] });
      onClose();
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUpload(file);
    if (url) setForm(f => ({ ...f, imageUrl: url }));
    setUploading(false);
  };

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        <h2 className="nexus-serif text-lg font-semibold">{story ? 'Edit Story' : 'New Story'}</h2>
      </div>
      <div className="nexus-card rounded-2xl border p-6 space-y-4">
        <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Title</label><input value={form.title} onChange={e => set('title', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" /></div>
        <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Student Name</label><input value={form.studentName} onChange={e => set('studentName', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Program</label><input value={form.program} onChange={e => set('program', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" /></div>
          <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Graduation Year</label><input value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" /></div>
        </div>
        <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Author</label><input value={form.author} onChange={e => set('author', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" /></div>
        <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Content</label><textarea value={form.content} onChange={e => set('content', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent min-h-[120px]" /></div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Image</label>
          {form.imageUrl && <img src={form.imageUrl} alt="" className="w-24 h-24 rounded-lg object-cover mb-2" />}
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--primary))] text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={14} />}
            {form.imageUrl ? 'Change Photo' : 'Choose Photo'}
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
          {uploading && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Uploading...</p>}
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} id="featured" className="rounded" />
          <label htmlFor="featured" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Featured</label>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          {story ? 'Update Story' : 'Create Story'}
        </Button>
      </div>
    </div>
  );
}

function PhotoGalleryManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: () => customFetch<Record<string, string>[]>(`${NAD_API}/api/v1/admin/gallery`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`${NAD_API}/api/v1/admin/gallery/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-gallery'] }),
  });

  const handleUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:8080/api/v1/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url || data.fileUrl || null;
    } catch { return null; }
  };

  if (showForm) {
    return <GalleryItemForm item={editing} onClose={() => { setShowForm(false); setEditing(null); }} onUpload={handleUpload} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><span className="mr-1">+</span> Add Photo</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">No gallery photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-[hsl(var(--border))] aspect-square">
              <img src={item.src} alt={item.alt || ''} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                <button onClick={() => { setEditing(item); setShowForm(true); }} className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"><Pencil size={12} className="text-white" /></button>
                <button onClick={() => { if (confirm('Delete this photo?')) deleteMutation.mutate(Number(item.id)); }} className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/80 transition-colors"><Trash2 size={12} className="text-white" /></button>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-xs text-white font-medium truncate">{item.caption || 'No caption'}</p>
                  {item.category && <p className="text-[10px] text-white/60 mt-0.5">{item.category}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryItemForm({ item, onClose, onUpload }: { item: Record<string, string> | null; onClose: () => void; onUpload: (file: File) => Promise<string | null> }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    src: item?.src || '', alt: item?.alt || '', caption: item?.caption || '',
    category: item?.category || '', span: item?.span || '1',
  });
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>): Promise<Record<string, string>> => {
      const body = { ...data, span: parseInt(data.span as string) || 1 };
      if (item?.id) return customFetch(`${NAD_API}/api/v1/admin/gallery/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return customFetch(`${NAD_API}/api/v1/admin/gallery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData<Record<string, string>[]>(['admin-gallery'], (old = []) => {
        const idx = old.findIndex((g) => String(g.id) === String(saved.id));
        if (idx >= 0) {
          const next = [...old];
          next[idx] = saved;
          return next;
        }
        return [saved, ...old];
      });
      await queryClient.refetchQueries({ queryKey: ['admin-gallery'] });
      onClose();
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUpload(file);
    if (url) setForm(f => ({ ...f, src: url }));
    setUploading(false);
  };

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        <h2 className="nexus-serif text-lg font-semibold">{item ? 'Edit Photo' : 'New Photo'}</h2>
      </div>
      <div className="nexus-card rounded-2xl border p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Photo</label>
          {form.src && <img src={form.src} alt="" className="w-32 h-32 rounded-lg object-cover mb-2" />}
          {!form.src && (
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-[hsl(var(--border))] flex items-center justify-center mb-2">
              <ImagePlus size={20} className="text-[hsl(var(--muted-foreground))]" />
            </div>
          )}
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--primary))] text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={14} />}
            {form.src ? 'Change Photo' : 'Choose Photo'}
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
          {uploading && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Uploading...</p>}
        </div>
        <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Caption</label><input value={form.caption} onChange={e => set('caption', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Describe this photo" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Category</label><input value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="e.g. Training, Graduation" /></div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Span</label>
            <select value={form.span} onChange={e => set('span', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent">
              <option value="1">Normal</option>
              <option value="2">Wide (2 cols)</option>
              <option value="3">Tall (2 rows)</option>
            </select>
          </div>
        </div>
        <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Alt Text</label><input value={form.alt} onChange={e => set('alt', e.target.value)} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Accessibility text" /></div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
          {item ? 'Update Photo' : 'Add Photo'}
        </Button>
      </div>
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/admin/login" component={LoginPage} />
    <Route path="/admin/programs/categories"><AuthGate><CategoriesPage /></AuthGate></Route>
    <Route path="/admin/programs"><AuthGate><ProgramsPage /></AuthGate></Route>
    <Route path="/admin/settings"><AuthGate><SiteSettingsPage /></AuthGate></Route>
    <Route path="/admin/applications/:id"><AuthGate><ApplicationDetailPage /></AuthGate></Route>
    <Route path="/admin/applications"><AuthGate><ApplicationsPage /></AuthGate></Route>
    <Route path="/admin"><AuthGate><DashboardPage /></AuthGate></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;