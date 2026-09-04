import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { customFetch } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Check, ArrowLeft } from 'lucide-react';

const NAP_API = 'http://localhost:8080';

type Programme = {
  id: number; code: string; name: string; faculty: string;
  minimumUcePasses: number; cutoffScore: number; essentialSubjects: string;
  relevantSubjects: string; desirableSubjects: string; entryRequirements: string;
  isActive: boolean; capacity: number;
};

export default function CutoffsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cutoffDraft, setCutoffDraft] = useState<Record<string, string>>({});
  const [savingCutoff, setSavingCutoff] = useState<string | null>(null);

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['admin-programmes'],
    queryFn: () => customFetch<Programme[]>(`${NAP_API}/api/v1/programmes`),
  });

  const cutoffMutation = useMutation({
    mutationFn: async ({ code, cutoffScore }: { code: string; cutoffScore: number }) => {
      await customFetch(`${NAP_API}/api/v1/admin/programmes/cutoff`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cutoffScore }),
      });
    },
    onMutate: ({ code }) => setSavingCutoff(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programmes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      setSavingCutoff(null);
    },
    onError: () => setSavingCutoff(null),
  });

  const saveCutoff = (code: string) => {
    const raw = (cutoffDraft[code] ?? '').trim();
    const value = raw === '' ? NaN : parseFloat(raw);
    if (isNaN(value)) return;
    cutoffMutation.mutate({ code, cutoffScore: value }, {
      onSuccess: () => setCutoffDraft(d => { const n = { ...d }; delete n[code]; return n; }),
    });
  };

  const filteredProgrammes = programmes.filter((p: Programme) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.faculty || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nexus-serif text-2xl font-bold">Cutoff Points</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Set the minimum weighted score required for admission per programme. Applicants see these cutoffs per course.</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] font-medium">{programmes.length} programmes</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/programs">
          <Button variant="outline" size="sm"><ArrowLeft size={14} className="mr-1" /> Back to Programs</Button>
        </Link>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programmes..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin" size={20} /></div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">No programmes found{search ? ' for your search' : ''}.</div>
        ) : (
          <div className="space-y-2 max-h-[calc(100dvh-260px)] overflow-y-auto pr-1">
            {filteredProgrammes.map((p: Programme) => {
              const draft = cutoffDraft[p.code];
              const isSaving = savingCutoff === p.code;
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{p.code}{p.faculty ? ` · ${p.faculty}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[10px] text-[hsl(var(--muted-foreground))] hidden sm:inline">Cutoff</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={draft !== undefined ? draft : String(p.cutoffScore)}
                      onChange={(e) => setCutoffDraft(d => ({ ...d, [p.code]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveCutoff(p.code); }}
                      className="w-24 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={() => saveCutoff(p.code)} disabled={isSaving || draft === undefined}>
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
