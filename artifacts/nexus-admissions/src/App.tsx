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
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
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
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

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
  const [navLinks, setNavLinks] = useState<Array<{ label: string; href: string; visible: boolean }>>([]);
  const [ctaButtons, setCtaButtons] = useState<Array<{ label: string; href: string; style: string; visible: boolean }>>([]);
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
  const [loaded, setLoaded] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (settings.length > 0 && !loaded) {
      setPortalName(getSetting('portal_name'));
      try { setNavLinks(JSON.parse(getSetting('nav_links'))); } catch { setNavLinks([]); }
      try { setCtaButtons(JSON.parse(getSetting('cta_buttons'))); } catch { setCtaButtons([]); }
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

      {/* Hero Tagline */}
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
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">The tagline above the student success story quote on the homepage.</p>
        <div className="flex gap-3">
          <Input value={successStoryTagline} onChange={(e) => setSuccessStoryTagline(e.target.value)} className="max-w-md" placeholder="e.g. Student Success Story" />
          <Button onClick={() => save('success_story_tagline', successStoryTagline)} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(localStorage.getItem('nap_admin_token') ? '/admin' : '/admin/login'); }, [setLocation]);
  return <PageLoader label="Opening Nexus admissions" />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/admin/login" component={LoginPage} />
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