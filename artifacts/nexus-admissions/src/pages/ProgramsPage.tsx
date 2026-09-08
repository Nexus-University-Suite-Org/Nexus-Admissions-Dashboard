import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { customFetch } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, Search, GraduationCap, BookOpen, ChevronDown, ChevronRight, X, GripVertical, Check, AlertCircle } from 'lucide-react';

const NAP_API = import.meta.env.VITE_NAP_API_BASE_URL ?? 'http://localhost:8080';

type Program = {
  id: number; programName: string; programCode: string; programType: string;
  awardQualification: string; programDescription: string; programObjectives: string;
  learningOutcomes: string; careerOpportunities: string; status: string;
  facultySchool: string; department: string; programCoordinator: string; campus: string;
  durationUnit: string; numberOfYears: number;
  semestersPerYear: number; totalCreditUnits: number; studyMode: string; academicCalendar: string;
  fees: string; admissionRequirements: string; curriculum: string; intakes: string;
  studyOptions: string; accreditation: string; documents: string;
  imageUrl: string; shortDescription: string; fullDescription: string;
  featured: boolean; displayOrder: number; createdBy: string; createdAt: string;
  updatedBy: string; updatedAt: string; categoryNames: string[];
  cutoffScore: number; essentialSubjects: string; relevantSubjects: string; desirableSubjects: string;
  minimumUcePasses: number; capacity: number; intakeYear: string;
};

type ProgramCategory = {
  id: number; name: string; description: string; displayOrder: number;
  createdAt: string; programs: { id: number; programName: string; programCode: string; programType: string }[];
};

const PROGRAM_TYPES = ['Certificate', 'Diploma', 'Undergraduate', 'Postgraduate Diploma', "Master's", 'PhD'];
const STATUSES = ['Active', 'Inactive', 'Suspended', 'Archived'];
const STUDY_MODES = ['Full-Time', 'Part-Time', 'Evening', 'Weekend', 'Online', 'Distance Learning'];
const DURATION_UNITS = ['Years', 'Months'];
const CALENDARS = ['Semester', 'Trimester', 'Quarter'];

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export default function ProgramsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: () => customFetch<Program[]>(`${NAP_API}/api/v1/admin/programs`),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-program-categories'],
    queryFn: () => customFetch<ProgramCategory[]>(`${NAP_API}/api/v1/admin/program-categories`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`${NAP_API}/api/v1/admin/programs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
  });

  const filtered = programs.filter(p => {
    if (search && !p.programName.toLowerCase().includes(search.toLowerCase()) && !p.programCode?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && p.programType !== filterType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const statusColor = (s: string) => {
    if (s === 'Active') return 'bg-emerald-100 text-emerald-700';
    if (s === 'Inactive') return 'bg-gray-100 text-gray-600';
    if (s === 'Suspended') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  };

  const openEdit = (p: Program) => { setEditingProgram(p); setShowForm(true); };
  const openNew = () => { setEditingProgram(null); setShowForm(true); };

  if (showForm) {
    return <ProgramForm program={editingProgram} categories={categories} onClose={() => { setShowForm(false); setEditingProgram(null); }} />;
  }

  const subjects = (raw: string) => {
    const parsed = parseJson<string[]>(raw, []);
    if (parsed.length && raw.trim().startsWith('[')) return parsed;
    return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="nexus-serif text-2xl font-bold">Programs</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Browse all academic programmes offered by your institution and manage their public marketing profiles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/programs/categories">
            <Button variant="outline" size="sm"><BookOpen size={14} className="mr-1" /> Categories</Button>
          </Link>
          <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Add Program</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programmes..." className="pl-9" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h2 className="nexus-serif text-lg font-bold">All Programmes</h2>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] font-medium">{filtered.length} of {programs.length}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="nexus-card rounded-2xl border p-12 text-center">
          <GraduationCap size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No programmes found. Click <strong>Add Program</strong> to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="nexus-card rounded-2xl border overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-[hsl(var(--muted)/.3)] transition-colors cursor-pointer">
                <GripVertical size={16} className="text-[hsl(var(--muted-foreground))] opacity-30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{p.programName}</h3>
                    {p.programCode && <span className="text-[10px] font-mono bg-[hsl(var(--muted))] px-2 py-0.5 rounded">{p.programCode}</span>}
                    {p.programType && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p.programType}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] flex-wrap">
                    {p.facultySchool && <span>{p.facultySchool}</span>}
                    {p.numberOfYears ? <span>{p.numberOfYears} {p.durationUnit || 'years'}</span> : null}
                    {p.totalCreditUnits && <span>{p.totalCreditUnits} credits</span>}
                    {p.studyMode && <span>{p.studyMode}</span>}
                    <span>Min UCE passes: {p.minimumUcePasses ?? 5}</span>
                    {p.capacity ? <span>Capacity: {p.capacity}</span> : null}
                    {p.cutoffScore ? <span className="text-accent">Cutoff: {p.cutoffScore}</span> : null}
                    {p.categoryNames?.length > 0 && <span className="text-accent">{p.categoryNames.join(', ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this program?')) deleteMutation.mutate(p.id); }} className="text-red-500 hover:text-red-600"><Trash2 size={14} /></Button>
                  {expandedId === p.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>
              {expandedId === p.id && (
                <div className="border-t border-[hsl(var(--border))] p-5 space-y-4 bg-[hsl(var(--muted)/.1)]">
                  {p.shortDescription && <p className="text-sm text-[hsl(var(--muted-foreground))]">{p.shortDescription}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div><span className="text-[hsl(var(--muted-foreground))]">Department:</span> <span className="font-medium">{p.department || '—'}</span></div>
                    <div><span className="text-[hsl(var(--muted-foreground))]">Coordinator:</span> <span className="font-medium">{p.programCoordinator || '—'}</span></div>
                    <div><span className="text-[hsl(var(--muted-foreground))]">Campus:</span> <span className="font-medium">{p.campus || '—'}</span></div>
                    <div><span className="text-[hsl(var(--muted-foreground))]">Calendar:</span> <span className="font-medium">{p.academicCalendar || '—'}</span></div>
                  </div>
                  {p.fees && (() => {
                    const fees = parseJson(p.fees, {} as { currency?: string; year_fees?: { semesters: { total: number }[] }[] });
                    if (fees.year_fees?.length) {
                      const total = fees.year_fees.reduce((s, yf) => s + yf.semesters.reduce((s2, sem) => s2 + (sem.total || 0), 0), 0);
                      return <div className="text-xs"><span className="text-[hsl(var(--muted-foreground))]">Total Fee:</span> <span className="font-semibold">{fees.currency || ''} {total.toLocaleString()}</span></div>;
                    }
                    return null;
                  })()}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div><span className="text-[hsl(var(--muted-foreground))]">Min UCE passes:</span> <span className="font-medium">{p.minimumUcePasses ?? 5}</span></div>
                    <div><span className="text-[hsl(var(--muted-foreground))]">Capacity:</span> <span className="font-medium">{p.capacity || '—'}</span></div>
                    <div><span className="text-[hsl(var(--muted-foreground))]">Intake Year:</span> <span className="font-medium">{p.intakeYear || '—'}</span></div>
                    <div><span className="text-[hsl(var(--muted-foreground))]">Cutoff:</span> <span className="font-medium">{p.cutoffScore || '—'}</span></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1.5">Essential Subjects</p>
                      {subjects(p.essentialSubjects).length ? (
                        <div className="flex flex-wrap gap-1.5">{subjects(p.essentialSubjects).map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{s}</span>)}</div>
                      ) : <p className="text-[hsl(var(--muted-foreground))]">—</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1.5">Relevant Subjects</p>
                      {subjects(p.relevantSubjects).length ? (
                        <div className="flex flex-wrap gap-1.5">{subjects(p.relevantSubjects).map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{s}</span>)}</div>
                      ) : <p className="text-[hsl(var(--muted-foreground))]">—</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1.5">Desirable Subjects</p>
                      {subjects(p.desirableSubjects).length ? (
                        <div className="flex flex-wrap gap-1.5">{subjects(p.desirableSubjects).map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">{s}</span>)}</div>
                      ) : <p className="text-[hsl(var(--muted-foreground))]">—</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramForm({ program, categories, onClose }: { program: Program | null; categories: ProgramCategory[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [section, setSection] = useState<'identity' | 'about' | 'org' | 'duration' | 'curriculum' | 'fees' | 'admission' | 'intakes' | 'accreditation' | 'documents' | 'presentation' | 'summary'>('identity');
  const [toast, setToast] = useState<string | null>(null);
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [collapsedFeeYears, setCollapsedFeeYears] = useState<Set<string>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: string) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3000); };

  const [form, setForm] = useState({
    programName: program?.programName || '', programCode: program?.programCode || '', programType: program?.programType || '',
    awardQualification: program?.awardQualification || '', programDescription: program?.programDescription || '',
    programObjectives: program?.programObjectives || '', learningOutcomes: program?.learningOutcomes || '',
    careerOpportunities: program?.careerOpportunities || '', status: program?.status || 'Active',
    facultySchool: program?.facultySchool || '', department: program?.department || '',
    programCoordinator: program?.programCoordinator || '', campus: program?.campus || '',
    durationUnit: program?.durationUnit || 'Years',
    numberOfYears: program?.numberOfYears || 1,
    semestersPerYear: program?.semestersPerYear || 2, totalCreditUnits: program?.totalCreditUnits || 0,
    studyMode: program?.studyMode || '', academicCalendar: program?.academicCalendar || 'Semester',
    imageUrl: program?.imageUrl || '', shortDescription: program?.shortDescription || '',
    fullDescription: program?.fullDescription || '', featured: program?.featured || false,
    displayOrder: program?.displayOrder || 0,
    cutoffScore: program?.cutoffScore || 0, essentialSubjects: program?.essentialSubjects || '',
    relevantSubjects: program?.relevantSubjects || '', desirableSubjects: program?.desirableSubjects || '',
    minimumUcePasses: program?.minimumUcePasses || 5, capacity: program?.capacity || 100,
    intakeYear: program?.intakeYear || '',
  });

  const [fees, setFees] = useState(() => parseJson(program?.fees, { currency: 'UGX', year_fees: [] as { year: number; semesters: { semester: number; tuition: number; registration: number; examination: number; functional: number; ict: number; library: number; medical: number; accommodation: number; other: number; total: number }[] }[] }));
  const [admissionReq, setAdmissionReq] = useState(() => parseJson(program?.admissionRequirements, { min_qualification: '', min_grade: '', required_subjects: '', min_points: '', direct_entry: '', diploma_entry: '', mature_age_entry: '', international: '', other: '' }));
  const [curriculum, setCurriculum] = useState(() => parseJson(program?.curriculum, { curriculum_name: '', version: '', academic_year: '', total_credit_units: 0, years: [] as { year: number; semesters: { semester: number; courses: { code: string; name: string; credits: number; type: string; prerequisites: string }[]; electiveGroups: { groupName: string; requiredCount: number; courses: { code: string; name: string; credits: number; type: string; prerequisites: string }[] }[] }[]; recessTerms: { name: string; courses: { code: string; name: string; credits: number; type: string; prerequisites: string }[]; electiveGroups: { groupName: string; requiredCount: number; courses: { code: string; name: string; credits: number; type: string; prerequisites: string }[] }[] }[] }[] }));
  const [intakesList, setIntakesList] = useState(() => parseJson(program?.intakes, [] as { name: string; month: string; academic_year: string; app_open: string; app_close: string; admission_start: string; max_students: number; status: string }[]));
  const [accreditation, setAccreditation] = useState(() => parseJson(program?.accreditation, { status: '', body: '', number: '', date: '', expiry: '', document_url: '' }));
  const [documentsList, setDocumentsList] = useState(() => parseJson(program?.documents, [] as { type: string; name: string; url: string }[]));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() => {
    if (!program?.categoryNames) return [];
    return categories.filter(c => program.categoryNames.includes(c.name)).map(c => c.id);
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const body = { ...data, fees: JSON.stringify(data.fees), admissionRequirements: JSON.stringify(data.admissionRequirements), curriculum: JSON.stringify(data.curriculum), intakes: JSON.stringify(data.intakes), accreditation: JSON.stringify(data.accreditation), documents: JSON.stringify(data.documents) };
      if (program?.id) return customFetch(`${NAP_API}/api/v1/admin/programs/${program.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return customFetch(`${NAP_API}/api/v1/admin/programs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    },
    onSuccess: async (saved: Program) => {
      // Sync categories
      if (program?.id) {
        const currentCats = categories.filter(c => c.programs.some(p => p.id === program.id)).map(c => c.id);
        for (const catId of currentCats) {
          if (!selectedCategoryIds.includes(catId)) {
            await customFetch(`${NAP_API}/api/v1/admin/programs/${program.id}/categories/${catId}`, { method: 'DELETE' });
          }
        }
      }
      for (const catId of selectedCategoryIds) {
        await customFetch(`${NAP_API}/api/v1/admin/programs/${saved.id}/categories/${catId}`, { method: 'POST' });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-program-categories'] });
      showToast(program ? 'Program updated successfully' : 'Program created successfully');
      setTimeout(() => onClose(), 800);
    },
  });

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const addYear = () => {
    const newYear = { year: curriculum.years.length + 1, semesters: [] as typeof curriculum.years[0]['semesters'], recessTerms: [] as typeof curriculum.years[0]['recessTerms'] };
    for (let s = 1; s <= (form.semestersPerYear || 2); s++) {
      newYear.semesters.push({ semester: s, courses: [] });
    }
    setCurriculum(c => ({ ...c, years: [...c.years, newYear] }));
    set('numberOfYears', curriculum.years.length + 1);
  };

  const addRecessTerm = (yearIdx: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => yi === yearIdx ? { ...y, recessTerms: [...y.recessTerms, { name: `Recess Term ${y.recessTerms.length + 1}`, courses: [] }] } : y)
    }));
  };

  const removeRecessTerm = (yearIdx: number, recessIdx: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => yi === yearIdx ? { ...y, recessTerms: y.recessTerms.filter((_, ri) => ri !== recessIdx) } : y)
    }));
  };

  const addElectiveGroup = (yearIdx: number, semIdx: number, recessIdx?: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        const group = { groupName: '', requiredCount: 1, courses: [{ code: '', name: '', credits: 0, type: 'Elective', prerequisites: '' }] };
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, electiveGroups: [...(r.electiveGroups || []), group] } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, electiveGroups: [...(s.electiveGroups || []), group] } : s) };
      })
    }));
  };

  const removeElectiveGroup = (yearIdx: number, semIdx: number, groupIdx: number, recessIdx?: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, electiveGroups: (r.electiveGroups || []).filter((_, gi) => gi !== groupIdx) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, electiveGroups: (s.electiveGroups || []).filter((_, gi) => gi !== groupIdx) } : s) };
      })
    }));
  };

  const updateElectiveGroupField = (yearIdx: number, semIdx: number, groupIdx: number, field: string, value: unknown, recessIdx?: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, electiveGroups: (r.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, [field]: value } : g) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, electiveGroups: (s.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, [field]: value } : g) } : s) };
      })
    }));
  };

  const addCourseToElectiveGroup = (yearIdx: number, semIdx: number, groupIdx: number, recessIdx?: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        const newCourse = { code: '', name: '', credits: 0, type: 'Elective', prerequisites: '' };
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, electiveGroups: (r.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, courses: [...g.courses, newCourse] } : g) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, electiveGroups: (s.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, courses: [...g.courses, newCourse] } : g) } : s) };
      })
    }));
  };

  const updateElectiveGroupCourse = (yearIdx: number, semIdx: number, groupIdx: number, courseIdx: number, field: string, value: unknown, recessIdx?: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, electiveGroups: (r.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, courses: g.courses.map((cr, cri) => cri === courseIdx ? { ...cr, [field]: value } : cr) } : g) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, electiveGroups: (s.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, courses: g.courses.map((cr, cri) => cri === courseIdx ? { ...cr, [field]: value } : cr) } : g) } : s) };
      })
    }));
  };

  const removeElectiveGroupCourse = (yearIdx: number, semIdx: number, groupIdx: number, courseIdx: number, recessIdx?: number) => {
    setCurriculum(c => ({
      ...c,
      years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, electiveGroups: (r.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, courses: g.courses.filter((_, cri) => cri !== courseIdx) } : g) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, electiveGroups: (s.electiveGroups || []).map((g, gi) => gi === groupIdx ? { ...g, courses: g.courses.filter((_, cri) => cri !== courseIdx) } : g) } : s) };
      })
    }));
  };

  const addCourse = (yearIdx: number, semIdx: number, recessIdx?: number) => {
    setCurriculum(c => {
      const next = { ...c, years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, courses: [...r.courses, { code: '', name: '', credits: 0, type: 'Core', prerequisites: '' }] } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, courses: [...s.courses, { code: '', name: '', credits: 0, type: 'Core', prerequisites: '' }] } : s) };
      }) };
      return next;
    });
  };

  const updateCourse = (yearIdx: number, semIdx: number, courseIdx: number, field: string, value: unknown, recessIdx?: number) => {
    setCurriculum(c => {
      const next = { ...c, years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, courses: r.courses.map((cr, cri) => cri === courseIdx ? { ...cr, [field]: value } : cr) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, courses: s.courses.map((cr, cri) => cri === courseIdx ? { ...cr, [field]: value } : cr) } : s) };
      }) };
      return next;
    });
  };

  const removeCourse = (yearIdx: number, semIdx: number, courseIdx: number, recessIdx?: number) => {
    setCurriculum(c => {
      const next = { ...c, years: c.years.map((y, yi) => {
        if (yi !== yearIdx) return y;
        if (recessIdx !== undefined) {
          return { ...y, recessTerms: y.recessTerms.map((r, ri) => ri === recessIdx ? { ...r, courses: r.courses.filter((_, cri) => cri !== courseIdx) } : r) };
        }
        return { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, courses: s.courses.filter((_, cri) => cri !== courseIdx) } : s) };
      }) };
      return next;
    });
  };

  const sections = [
    { key: 'identity', label: 'Identity', icon: '1', required: ['programName'] },
    { key: 'about', label: 'About', icon: '2', required: [] },
    { key: 'org', label: 'Organization', icon: '3', required: [] },
    { key: 'duration', label: 'Duration', icon: '4', required: [] },
    { key: 'curriculum', label: 'Curriculum', icon: '5', required: [] },
    { key: 'fees', label: 'Fees', icon: '6', required: [] },
    { key: 'admission', label: 'Admission', icon: '7', required: [] },
    { key: 'intakes', label: 'Intakes', icon: '8', required: [] },
    { key: 'accreditation', label: 'Accreditation', icon: '9', required: [] },
    { key: 'documents', label: 'Documents', icon: '10', required: [] },
    { key: 'presentation', label: 'Presentation', icon: '11', required: [] },
    { key: 'summary', label: 'Review', icon: '✓', required: [] },
  ] as const;

  const sectionHint: Record<string, { title: string; desc: string }> = {
    identity: { title: 'Program Identity', desc: 'Give your program a name, code, and type.' },
    about: { title: 'About the Program', desc: 'Describe what students will learn and where it leads.' },
    org: { title: 'Organization', desc: 'Which faculty, department, and campus offers this program?' },
    duration: { title: 'Duration & Structure', desc: 'How long is the program? Set years, semesters, and study mode.' },
    curriculum: { title: 'Curriculum', desc: 'Build the course structure year by year, semester by semester.' },
    fees: { title: 'Fee Structure', desc: 'Set fees per semester. Sync from curriculum to get the structure.' },
    admission: { title: 'Admission Requirements', desc: 'What do applicants need to qualify?' },
    intakes: { title: 'Intake Periods', desc: 'When can students apply? Set application windows and capacity.' },
    accreditation: { title: 'Accreditation', desc: 'Is this program accredited? By whom?' },
    documents: { title: 'Documents', desc: 'Attach brochures, curriculum PDFs, or other files.' },
    presentation: { title: 'Public Presentation', desc: 'How this program appears to students on the website.' },
    summary: { title: 'Review & Submit', desc: 'Double-check everything before creating the program.' },
  };

  const totalCredits = curriculum.years.reduce((sum, y) => {
    const semCredits = y.semesters.reduce((s2, sem) => {
      const courseCredits = sem.courses.reduce((s3, cr) => s3 + (cr.credits || 0), 0);
      const electiveCredits = (sem.electiveGroups || []).reduce((s4, g) => s4 + g.courses.reduce((s5, cr) => s5 + (cr.credits || 0), 0), 0);
      return s2 + courseCredits + electiveCredits;
    }, 0);
    const recessCredits = (y.recessTerms || []).reduce((s2, rt) => {
      const courseCredits = rt.courses.reduce((s3, cr) => s3 + (cr.credits || 0), 0);
      const electiveCredits = (rt.electiveGroups || []).reduce((s4, g) => s4 + g.courses.reduce((s5, cr) => s5 + (cr.credits || 0), 0), 0);
      return s2 + courseCredits + electiveCredits;
    }, 0);
    return sum + semCredits + recessCredits;
  }, 0);

  const semesterFeeSum = (s: { tuition: number; registration: number; examination: number; functional: number; ict: number; library: number; medical: number; accommodation: number; other: number }) => s.tuition + s.registration + s.examination + s.functional + s.ict + s.library + s.medical + s.accommodation + s.other;

  const syncFeesToCurriculum = () => {
    setFees(f => {
      const existing = new Map<string, typeof f.year_fees[0]['semesters'][0]>();
      for (const yf of f.year_fees) for (const s of yf.semesters) existing.set(`${yf.year}-${s.name || s.semester}`, s);
      const year_fees = curriculum.years.map(y => {
        const semEntries = y.semesters.map(sem => {
          const key = `${y.year}-sem-${sem.semester}`;
          const prev = existing.get(key) || { tuition: 0, registration: 0, examination: 0, functional: 0, ict: 0, library: 0, medical: 0, accommodation: 0, other: 0, total: 0 };
          const total = semesterFeeSum(prev);
          return { ...prev, total, name: `Semester ${sem.semester}`, termType: 'semester' as const };
        });
        const recessEntries = (y.recessTerms || []).map((rt, ri) => {
          const key = `${y.year}-recess-${ri}`;
          const prev = existing.get(key) || { tuition: 0, registration: 0, examination: 0, functional: 0, ict: 0, library: 0, medical: 0, accommodation: 0, other: 0, total: 0 };
          const total = semesterFeeSum(prev);
          return { ...prev, total, name: rt.name || `Recess Term ${ri + 1}`, termType: 'recess' as const };
        });
        return { year: y.year, semesters: [...semEntries, ...recessEntries] };
      });
      return { ...f, year_fees };
    });
  };

  const initFeesFromCurriculum = () => {
    if (fees.year_fees.length === 0 && curriculum.years.length > 0) syncFeesToCurriculum();
  };

  const totalProgramFees = fees.year_fees.reduce((sum, yf) => sum + yf.semesters.reduce((s2, sem) => s2 + (sem.total || 0), 0), 0);

  const isSectionComplete = (key: string): boolean => {
    switch (key) {
      case 'identity': return Boolean(form.programName && form.programCode && form.programType);
      case 'about': return Boolean(form.programDescription);
      case 'org': return Boolean(form.facultySchool || form.department);
      case 'duration': return Boolean(form.numberOfYears > 0);
      case 'curriculum': return curriculum.years.length > 0 && curriculum.years.some(y => y.semesters.some(s => s.courses.length > 0) || (y.recessTerms || []).some(r => r.courses.length > 0));
      case 'fees': return fees.year_fees.length > 0 && fees.year_fees.some(yf => yf.semesters.some(s => s.total > 0));
      case 'admission': return Boolean(admissionReq.min_qualification);
      case 'intakes': return intakesList.length > 0;
      case 'accreditation': return Boolean(accreditation.status);
      case 'documents': return documentsList.length > 0;
      case 'presentation': return Boolean(form.shortDescription);
      default: return false;
    }
  };

  const sectionKey = section as string;
  const currentIdx = sections.findIndex(s => s.key === sectionKey);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === sections.length - 1;
  const progress = Math.round((sections.filter((_, i) => i < currentIdx || isSectionComplete(sections[i].key)).length / sections.length) * 100);

  const goNext = () => {
    if (isLast) return;
    setSection(sections[currentIdx + 1].key as typeof section);
  };
  const goBack = () => {
    if (isFirst) return;
    setSection(sections[currentIdx - 1].key as typeof section);
  };

  const toggleCollapse = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  };

  const handleSubmit = () => {
    saveMutation.mutate({ ...form, totalCreditUnits: totalCredits, fees, admissionRequirements: admissionReq, curriculum, intakes: intakesList, accreditation, documents: documentsList });
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        <div>
          <h1 className="nexus-serif text-2xl font-bold">{program ? 'Edit Program' : 'New Program'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-[hsl(var(--muted))] overflow-hidden">
              <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{progress}% complete</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-48 shrink-0 space-y-1 hidden lg:block">
          {sections.map((s, i) => {
            const active = section === s.key;
            const done = isSectionComplete(s.key);
            return (
                <button key={s.key} onClick={() => setSection(s.key as typeof section)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${active ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm' : done ? 'text-emerald-600 hover:bg-emerald-50' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}>
                <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? 'bg-white/20 text-[hsl(var(--primary-foreground))]' : done ? 'bg-emerald-100 text-emerald-600' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                  {done ? <Check size={10} /> : s.icon}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 border-b border-[hsl(var(--border))] pb-2 lg:hidden">
            {sections.map(s => (
              <button key={s.key} onClick={() => setSection(s.key as typeof section)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${section === s.key ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : isSectionComplete(s.key) ? 'text-emerald-600 bg-emerald-50' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}>
                {isSectionComplete(s.key) && <Check size={8} className="inline mr-0.5" />}{s.label}
              </button>
            ))}
          </div>

          <div className="nexus-card rounded-2xl border p-6 space-y-4 mt-4">
            {sectionHint[sectionKey] && (
              <div className="flex items-start gap-3 rounded-xl bg-[hsl(var(--muted)/.4)] px-4 py-3">
                <AlertCircle size={16} className="text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{sectionHint[sectionKey].title}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{sectionHint[sectionKey].desc}</p>
                </div>
              </div>
            )}

            {section === 'identity' && (
              <>
                <Field label="Program Name" value={form.programName} onChange={v => set('programName', v)} required />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Program Code" value={form.programCode} onChange={v => set('programCode', v)} placeholder="e.g. BSC-CS" required />
                  <SelectField label="Program Type" value={form.programType} onChange={v => set('programType', v)} options={PROGRAM_TYPES} required />
                </div>
                <Field label="Award / Qualification" value={form.awardQualification} onChange={v => set('awardQualification', v)} />
                <SelectField label="Status" value={form.status} onChange={v => set('status', v)} options={STATUSES} />
              </>
            )}
            {section === 'about' && (
              <>
                <TextareaField label="Program Description" value={form.programDescription} onChange={v => set('programDescription', v)} placeholder="What is this program about? What will students study?" />
                <TextareaField label="Program Objectives" value={form.programObjectives} onChange={v => set('programObjectives', v)} placeholder="What will graduates be able to do?" />
                <TextareaField label="Learning Outcomes" value={form.learningOutcomes} onChange={v => set('learningOutcomes', v)} placeholder="Key skills and knowledge gained" />
                <TextareaField label="Career Opportunities" value={form.careerOpportunities} onChange={v => set('careerOpportunities', v)} placeholder="Where can graduates work?" />
              </>
            )}
            {section === 'org' && (
              <>
                <Field label="Faculty / School" value={form.facultySchool} onChange={v => set('facultySchool', v)} />
                <Field label="Department" value={form.department} onChange={v => set('department', v)} />
                <Field label="Program Coordinator" value={form.programCoordinator} onChange={v => set('programCoordinator', v)} />
                <Field label="Campus" value={form.campus} onChange={v => set('campus', v)} />
              </>
            )}
            {section === 'duration' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <SelectField label="Duration Unit" value={form.durationUnit} onChange={v => set('durationUnit', v)} options={DURATION_UNITS} />
                  <Field label="Number of Years" value={form.numberOfYears} onChange={v => set('numberOfYears', parseInt(v) || 1)} type="number" />
                  <Field label="Semesters Per Year" value={form.semestersPerYear} onChange={v => set('semestersPerYear', parseInt(v) || 2)} type="number" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Total Credit Units</label>
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] px-4 py-2 text-sm font-bold">{totalCredits}</div>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Auto-calculated from Curriculum</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField label="Study Mode" value={form.studyMode} onChange={v => set('studyMode', v)} options={STUDY_MODES} />
                  <SelectField label="Academic Calendar" value={form.academicCalendar} onChange={v => set('academicCalendar', v)} options={CALENDARS} />
                </div>
              </>
            )}
            {section === 'curriculum' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Curriculum Name" value={curriculum.curriculum_name} onChange={v => setCurriculum(c => ({ ...c, curriculum_name: v }))} />
                  <Field label="Version" value={curriculum.version} onChange={v => setCurriculum(c => ({ ...c, version: v }))} />
                </div>
                <Field label="Academic Year" value={curriculum.academic_year} onChange={v => setCurriculum(c => ({ ...c, academic_year: v }))} />
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-2">Credits = weight of each course. Typical values: 2–5 per course. Total auto-calculated for the program.</p>
                {curriculum.years.map((year, yi) => {
                  const yKey = `y${yi}`;
                  const collapsed = collapsedYears.has(yKey);
                  const semCredits = year.semesters.reduce((s, sem) => s + sem.courses.reduce((s2, cr) => s2 + (cr.credits || 0), 0), 0);
                  const recessCredits = (year.recessTerms || []).reduce((s, rt) => s + rt.courses.reduce((s2, cr) => s2 + (cr.credits || 0), 0), 0);
                  const yearCredits = semCredits + recessCredits;
                  return (
                    <div key={yi} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                      <button onClick={() => toggleCollapse(collapsedYears, setCollapsedYears, yKey)} className="w-full flex items-center gap-2 p-4 text-left hover:bg-[hsl(var(--muted)/.3)] cursor-pointer">
                        <BookOpen size={14} className="shrink-0" />
                        <span className="text-sm font-semibold flex-1">Year {year.year}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{yearCredits} credits{(year.recessTerms || []).length > 0 ? ` (${(year.recessTerms || []).length} recess)` : ''}</span>
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {!collapsed && (
                        <div className="border-t border-[hsl(var(--border))] p-4 space-y-4">
                          {year.semesters.map((sem, si) => (
                            <div key={si} className="ml-4 space-y-2">
                              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Semester {sem.semester}</p>
                              {sem.courses.map((cr, cri) => (
                                <div key={cri} className="flex items-center gap-2 ml-4">
                                  <Input value={cr.code} onChange={e => updateCourse(yi, si, cri, 'code', e.target.value)} placeholder="Code" className="w-24 text-xs" />
                                  <Input value={cr.name} onChange={e => updateCourse(yi, si, cri, 'name', e.target.value)} placeholder="Course Name" className="flex-1 text-xs" />
                                  <Input value={cr.credits} onChange={e => updateCourse(yi, si, cri, 'credits', parseInt(e.target.value) || 0)} type="number" placeholder="Credits" className="w-20 text-xs" title="Credit units for this course" />
                                  <select value={cr.type} onChange={e => updateCourse(yi, si, cri, 'type', e.target.value)} className="text-xs border border-[hsl(var(--border))] rounded-lg px-2 py-1 bg-transparent">
                                    <option value="Core">Core</option><option value="Elective">Elective</option><option value="Audited">Audited</option>
                                  </select>
                                  <Button variant="ghost" size="sm" onClick={() => removeCourse(yi, si, cri)} className="text-red-500 p-1"><X size={12} /></Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => addCourse(yi, si)} className="ml-4 text-xs"><Plus size={12} className="mr-1" /> Add Course</Button>
                              {(sem.electiveGroups || []).map((group, gi) => (
                                <div key={gi} className="ml-4 mt-3 border border-violet-200 bg-violet-50/50 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Elective Group</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeElectiveGroup(yi, si, gi)} className="text-red-500 p-0.5"><X size={11} /></Button>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Input value={group.groupName} onChange={e => updateElectiveGroupField(yi, si, gi, 'groupName', e.target.value)} placeholder="Group name (e.g. 'CS Electives')" className="text-xs flex-1" />
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="text-[hsl(var(--muted-foreground))]">Choose</span>
                                      <Input value={group.requiredCount} onChange={e => updateElectiveGroupField(yi, si, gi, 'requiredCount', parseInt(e.target.value) || 1)} type="number" className="w-14 text-xs text-center" min={1} />
                                      <span className="text-[hsl(var(--muted-foreground))]">from {group.courses.length}</span>
                                    </div>
                                  </div>
                                  {group.courses.map((cr, cri) => (
                                    <div key={cri} className="flex items-center gap-2 ml-2">
                                      <Input value={cr.code} onChange={e => updateElectiveGroupCourse(yi, si, gi, cri, 'code', e.target.value)} placeholder="Code" className="w-24 text-xs" />
                                      <Input value={cr.name} onChange={e => updateElectiveGroupCourse(yi, si, gi, cri, 'name', e.target.value)} placeholder="Course Name" className="flex-1 text-xs" />
                                      <Input value={cr.credits} onChange={e => updateElectiveGroupCourse(yi, si, gi, cri, 'credits', parseInt(e.target.value) || 0)} type="number" placeholder="Cr" className="w-16 text-xs" />
                                      <Button variant="ghost" size="sm" onClick={() => removeElectiveGroupCourse(yi, si, gi, cri)} className="text-red-500 p-1"><X size={11} /></Button>
                                    </div>
                                  ))}
                                  <Button variant="ghost" size="sm" onClick={() => addCourseToElectiveGroup(yi, si, gi)} className="ml-2 text-xs text-violet-600"><Plus size={11} className="mr-1" /> Add Option</Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => addElectiveGroup(yi, si)} className="ml-4 text-xs text-violet-600 hover:text-violet-700"><Plus size={12} className="mr-1" /> Add Elective Group</Button>
                            </div>
                          ))}
                          {(year.recessTerms || []).map((rt, ri) => (
                            <div key={`r${ri}`} className="ml-4 space-y-2 border-t border-dashed border-[hsl(var(--border)/.5)] pt-3">
                              <div className="flex items-center gap-2">
                                <Input value={rt.name} onChange={e => setCurriculum(c => ({ ...c, years: c.years.map((y, j) => j === yi ? { ...y, recessTerms: y.recessTerms.map((r, k) => k === ri ? { ...r, name: e.target.value } : r) } : y) }))} className="text-xs font-medium w-48 bg-amber-50 border-amber-200" />
                                <Button variant="ghost" size="sm" onClick={() => removeRecessTerm(yi, ri)} className="text-red-500 p-1"><X size={12} /></Button>
                              </div>
                              {rt.courses.map((cr, cri) => (
                                <div key={cri} className="flex items-center gap-2 ml-4">
                                  <Input value={cr.code} onChange={e => updateCourse(yi, 0, cri, 'code', e.target.value, ri)} placeholder="Code" className="w-24 text-xs" />
                                  <Input value={cr.name} onChange={e => updateCourse(yi, 0, cri, 'name', e.target.value, ri)} placeholder="Course Name" className="flex-1 text-xs" />
                                  <Input value={cr.credits} onChange={e => updateCourse(yi, 0, cri, 'credits', parseInt(e.target.value) || 0, ri)} type="number" placeholder="Credits" className="w-20 text-xs" title="Credit units for this course" />
                                  <select value={cr.type} onChange={e => updateCourse(yi, 0, cri, 'type', e.target.value, ri)} className="text-xs border border-[hsl(var(--border))] rounded-lg px-2 py-1 bg-transparent">
                                    <option value="Core">Core</option><option value="Elective">Elective</option><option value="Audited">Audited</option>
                                  </select>
                                  <Button variant="ghost" size="sm" onClick={() => removeCourse(yi, 0, cri, ri)} className="text-red-500 p-1"><X size={12} /></Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => addCourse(yi, 0, ri)} className="ml-4 text-xs"><Plus size={12} className="mr-1" /> Add Course</Button>
                              {(rt.electiveGroups || []).map((group, gi) => (
                                <div key={gi} className="ml-4 mt-3 border border-violet-200 bg-violet-50/50 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Elective Group</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeElectiveGroup(yi, 0, gi, ri)} className="text-red-500 p-0.5"><X size={11} /></Button>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Input value={group.groupName} onChange={e => updateElectiveGroupField(yi, 0, gi, 'groupName', e.target.value, ri)} placeholder="Group name (e.g. 'CS Electives')" className="text-xs flex-1" />
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="text-[hsl(var(--muted-foreground))]">Choose</span>
                                      <Input value={group.requiredCount} onChange={e => updateElectiveGroupField(yi, 0, gi, 'requiredCount', parseInt(e.target.value) || 1, ri)} type="number" className="w-14 text-xs text-center" min={1} />
                                      <span className="text-[hsl(var(--muted-foreground))]">from {group.courses.length}</span>
                                    </div>
                                  </div>
                                  {group.courses.map((cr, cri) => (
                                    <div key={cri} className="flex items-center gap-2 ml-2">
                                      <Input value={cr.code} onChange={e => updateElectiveGroupCourse(yi, 0, gi, cri, 'code', e.target.value, ri)} placeholder="Code" className="w-24 text-xs" />
                                      <Input value={cr.name} onChange={e => updateElectiveGroupCourse(yi, 0, gi, cri, 'name', e.target.value, ri)} placeholder="Course Name" className="flex-1 text-xs" />
                                      <Input value={cr.credits} onChange={e => updateElectiveGroupCourse(yi, 0, gi, cri, 'credits', parseInt(e.target.value) || 0, ri)} type="number" placeholder="Cr" className="w-16 text-xs" />
                                      <Button variant="ghost" size="sm" onClick={() => removeElectiveGroupCourse(yi, 0, gi, cri, ri)} className="text-red-500 p-1"><X size={11} /></Button>
                                    </div>
                                  ))}
                                  <Button variant="ghost" size="sm" onClick={() => addCourseToElectiveGroup(yi, 0, gi, ri)} className="ml-2 text-xs text-violet-600"><Plus size={11} className="mr-1" /> Add Option</Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => addElectiveGroup(yi, 0, ri)} className="ml-4 text-xs text-violet-600 hover:text-violet-700"><Plus size={12} className="mr-1" /> Add Elective Group</Button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" onClick={() => addRecessTerm(yi)} className="ml-4 text-xs text-amber-600 hover:text-amber-700"><Plus size={12} className="mr-1" /> Add Recess Term</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={addYear}><Plus size={14} className="mr-1" /> Add Year</Button>
              </>
            )}
            {section === 'fees' && (
              <>
                <div className="flex items-center gap-4 mb-2">
                  <Field label="Currency" value={fees.currency} onChange={v => setFees(f => ({ ...f, currency: v }))} />
                  {curriculum.years.length > 0 && (
                    <Button onClick={fees.year_fees.length === 0 ? initFeesFromCurriculum : syncFeesToCurriculum} className="mt-5 gap-1.5">
                      <BookOpen size={14} /> {fees.year_fees.length === 0 ? 'Sync Fees from Curriculum' : 'Resync from Curriculum'}
                    </Button>
                  )}
                </div>
                {fees.year_fees.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-8 text-center">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Add curriculum years first, then click <strong>"Sync Fees from Curriculum"</strong> to generate the fee structure.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                    {fees.year_fees.map((yf, yi) => {
                      const yKey = `fy${yi}`;
                      const collapsed = collapsedFeeYears.has(yKey);
                      const yearTotal = yf.semesters.reduce((s, sem) => s + (sem.total || 0), 0);
                      return (
                        <div key={yi} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                          <button onClick={() => toggleCollapse(collapsedFeeYears, setCollapsedFeeYears, yKey)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-[hsl(var(--muted)/.3)] cursor-pointer">
                            <BookOpen size={14} className="shrink-0" />
                            <span className="text-sm font-semibold flex-1">Year {yf.year}</span>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{fees.currency} {yearTotal.toLocaleString()}</span>
                            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {!collapsed && (
                            <div className="border-t border-[hsl(var(--border))] p-3 space-y-3">
                              {yf.semesters.map((sem, si) => {
                                const update = (field: string, val: number) => {
                                  setFees(f => {
                                    const next = { ...f, year_fees: f.year_fees.map((y, j) => j === yi ? { ...y, semesters: y.semesters.map((s, k) => k === si ? { ...s, [field]: val, total: semesterFeeSum({ ...s, [field]: val }) } : s) } : y) };
                                    return next;
                                  });
                                };
                                return (
                                  <div key={si} className="ml-4 border border-[hsl(var(--border)/.5)] rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Semester {sem.semester}</p>
                                    <div className="grid grid-cols-3 gap-3">
                                      <Field label="Tuition" value={sem.tuition} onChange={v => update('tuition', parseFloat(v) || 0)} type="number" />
                                      <Field label="Registration" value={sem.registration} onChange={v => update('registration', parseFloat(v) || 0)} type="number" />
                                      <Field label="Examination" value={sem.examination} onChange={v => update('examination', parseFloat(v) || 0)} type="number" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <Field label="Functional" value={sem.functional} onChange={v => update('functional', parseFloat(v) || 0)} type="number" />
                                      <Field label="ICT / Technology" value={sem.ict} onChange={v => update('ict', parseFloat(v) || 0)} type="number" />
                                      <Field label="Library" value={sem.library} onChange={v => update('library', parseFloat(v) || 0)} type="number" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <Field label="Medical" value={sem.medical} onChange={v => update('medical', parseFloat(v) || 0)} type="number" />
                                      <Field label="Accommodation" value={sem.accommodation} onChange={v => update('accommodation', parseFloat(v) || 0)} type="number" />
                                      <Field label="Other" value={sem.other} onChange={v => update('other', parseFloat(v) || 0)} type="number" />
                                    </div>
                                    <div className="rounded-lg bg-[hsl(var(--muted)/.3)] px-3 py-2 text-xs font-bold">
                                      Semester Total: {fees.currency} {sem.total.toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="rounded-xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.05)] px-4 py-3">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Total Program Fees</span>
                  <p className="text-lg font-bold">{fees.currency} {totalProgramFees.toLocaleString()}</p>
                </div>
              </>
            )}
            {section === 'admission' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Cutoff Score (AGP)" value={form.cutoffScore} onChange={v => set('cutoffScore', parseFloat(v) || 0)} type="number" placeholder="e.g. 26" />
                  <Field label="Min UCE Passes" value={form.minimumUcePasses} onChange={v => set('minimumUcePasses', parseInt(v) || 5)} type="number" />
                  <Field label="Capacity" value={form.capacity} onChange={v => set('capacity', parseInt(v) || 100)} type="number" />
                  <Field label="Intake Year" value={form.intakeYear} onChange={v => set('intakeYear', v)} placeholder="e.g. 2026" />
                </div>
                <Field label="Essential Subjects" value={form.essentialSubjects} onChange={v => set('essentialSubjects', v)} placeholder="Comma-separated, e.g. Mathematics, Physics, Chemistry" />
                <Field label="Relevant Subjects" value={form.relevantSubjects} onChange={v => set('relevantSubjects', v)} placeholder="Comma-separated" />
                <Field label="Desirable Subjects" value={form.desirableSubjects} onChange={v => set('desirableSubjects', v)} placeholder="Comma-separated" />
                <Field label="Minimum Entry Qualification" value={admissionReq.min_qualification} onChange={v => setAdmissionReq(f => ({ ...f, min_qualification: v }))} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Minimum Grade" value={admissionReq.min_grade} onChange={v => setAdmissionReq(f => ({ ...f, min_grade: v }))} />
                  <Field label="Minimum Points" value={admissionReq.min_points} onChange={v => setAdmissionReq(f => ({ ...f, min_points: v }))} />
                </div>
                <Field label="Required Subjects" value={admissionReq.required_subjects} onChange={v => setAdmissionReq(f => ({ ...f, required_subjects: v }))} placeholder="Comma-separated" />
                <TextareaField label="Direct Entry" value={admissionReq.direct_entry} onChange={v => setAdmissionReq(f => ({ ...f, direct_entry: v }))} />
                <TextareaField label="Diploma Entry" value={admissionReq.diploma_entry} onChange={v => setAdmissionReq(f => ({ ...f, diploma_entry: v }))} />
                <TextareaField label="Mature Age Entry" value={admissionReq.mature_age_entry} onChange={v => setAdmissionReq(f => ({ ...f, mature_age_entry: v }))} />
                <TextareaField label="International Student Requirements" value={admissionReq.international} onChange={v => setAdmissionReq(f => ({ ...f, international: v }))} />
                <TextareaField label="Other Requirements" value={admissionReq.other} onChange={v => setAdmissionReq(f => ({ ...f, other: v }))} />
              </>
            )}
            {section === 'intakes' && (
              <>
                {intakesList.map((intake, i) => (
                  <div key={i} className="border border-[hsl(var(--border))] rounded-xl p-4 space-y-3 relative">
                    <button onClick={() => setIntakesList(list => list.filter((_, j) => j !== i))} className="absolute top-3 right-3 text-red-500"><X size={14} /></button>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Intake Name" value={intake.name} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, name: v } : item))} />
                      <SelectField label="Month" value={intake.month} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, month: v } : item))} options={['January', 'May', 'August']} />
                      <Field label="Academic Year" value={intake.academic_year} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, academic_year: v } : item))} />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <Field label="App Opens" value={intake.app_open} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, app_open: v } : item))} type="date" />
                      <Field label="App Closes" value={intake.app_close} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, app_close: v } : item))} type="date" />
                      <Field label="Admission Start" value={intake.admission_start} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, admission_start: v } : item))} type="date" />
                      <Field label="Max Students" value={intake.max_students} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, max_students: parseInt(v) || 0 } : item))} type="number" />
                    </div>
                    <SelectField label="Status" value={intake.status} onChange={v => setIntakesList(list => list.map((item, j) => j === i ? { ...item, status: v } : item))} options={['Open', 'Closed', 'Upcoming']} />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setIntakesList(list => [...list, { name: '', month: 'January', academic_year: '', app_open: '', app_close: '', admission_start: '', max_students: 0, status: 'Open' }])}><Plus size={14} className="mr-1" /> Add Intake</Button>
              </>
            )}
            {section === 'accreditation' && (
              <>
                <SelectField label="Status" value={accreditation.status} onChange={v => setAccreditation(a => ({ ...a, status: v }))} options={['Accredited', 'Pending', 'Not Accredited']} />
                <Field label="Accreditation Body" value={accreditation.body} onChange={v => setAccreditation(a => ({ ...a, body: v }))} />
                <Field label="Accreditation Number" value={accreditation.number} onChange={v => setAccreditation(a => ({ ...a, number: v }))} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Accreditation Date" value={accreditation.date} onChange={v => setAccreditation(a => ({ ...a, date: v }))} type="date" />
                  <Field label="Expiry Date" value={accreditation.expiry} onChange={v => setAccreditation(a => ({ ...a, expiry: v }))} type="date" />
                </div>
              </>
            )}
            {section === 'documents' && (
              <>
                {documentsList.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <select value={doc.type} onChange={e => setDocumentsList(list => list.map((d, j) => j === i ? { ...d, type: e.target.value } : d))} className="text-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 bg-transparent">
                      <option value="Brochure">Brochure</option><option value="Curriculum">Curriculum</option><option value="Accreditation">Accreditation</option><option value="Admission Guidelines">Admission Guidelines</option><option value="Other">Other</option>
                    </select>
                    <Input value={doc.name} onChange={e => setDocumentsList(list => list.map((d, j) => j === i ? { ...d, name: e.target.value } : d))} placeholder="Document name" className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => setDocumentsList(list => list.filter((_, j) => j !== i))} className="text-red-500"><X size={14} /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDocumentsList(list => [...list, { type: 'Brochure', name: '', url: '' }])}><Plus size={14} className="mr-1" /> Add Document</Button>
              </>
            )}
            {section === 'presentation' && (
              <>
                <Field label="Image URL" value={form.imageUrl} onChange={v => set('imageUrl', v)} placeholder="https://..." />
                <TextareaField label="Short Description" value={form.shortDescription} onChange={v => set('shortDescription', v)} />
                <TextareaField label="Full Description" value={form.fullDescription} onChange={v => set('fullDescription', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="rounded" />
                    <label className="text-sm">Featured Program</label>
                  </div>
                  <Field label="Display Order" value={form.displayOrder} onChange={v => set('displayOrder', parseInt(v) || 0)} type="number" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button key={c.id} onClick={() => setSelectedCategoryIds(ids => ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id])} className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${selectedCategoryIds.includes(c.id) ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>{c.name}</button>
                    ))}
                    {categories.length === 0 && <span className="text-xs text-[hsl(var(--muted-foreground))]">No categories yet. Create one in Categories.</span>}
                  </div>
                </div>
              </>
            )}
            {section === 'summary' && (
              <div className="space-y-5">
                <SummaryRow label="Program Name" value={form.programName || '—'} />
                <SummaryRow label="Code" value={form.programCode || '—'} />
                <SummaryRow label="Type" value={form.programType || '—'} />
                <SummaryRow label="Award" value={form.awardQualification || '—'} />
                <SummaryRow label="Status" value={form.status || '—'} />
                <hr className="border-[hsl(var(--border))]" />
                <SummaryRow label="Faculty" value={form.facultySchool || '—'} />
                <SummaryRow label="Department" value={form.department || '—'} />
                <SummaryRow label="Coordinator" value={form.programCoordinator || '—'} />
                <SummaryRow label="Campus" value={form.campus || '—'} />
                <hr className="border-[hsl(var(--border))]" />
                <SummaryRow label="Duration" value={form.numberOfYears ? `${form.numberOfYears} ${form.durationUnit}` : '—'} />
                <SummaryRow label="Years" value={String(form.numberOfYears)} />
                <SummaryRow label="Semesters Per Year" value={String(form.semestersPerYear)} />
                <SummaryRow label="Study Mode" value={form.studyMode || '—'} />
                <SummaryRow label="Total Credits" value={String(totalCredits)} />
                <hr className="border-[hsl(var(--border))]" />
                <SummaryRow label="Curriculum" value={`${curriculum.years.length} years, ${curriculum.years.reduce((s, y) => s + y.semesters.reduce((s2, sem) => s2 + sem.courses.length, 0) + (y.recessTerms || []).reduce((s2, rt) => s2 + rt.courses.length, 0), 0)} courses`} />
                <SummaryRow label="Total Fees" value={`${fees.currency} ${totalProgramFees.toLocaleString()}`} />
                <SummaryRow label="Intakes" value={`${intakesList.length} intake(s)`} />
                <SummaryRow label="Accreditation" value={accreditation.status || '—'} />
                <SummaryRow label="Documents" value={`${documentsList.length} file(s)`} />
                <SummaryRow label="Categories" value={selectedCategoryIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(', ') || '—'} />
                {form.shortDescription && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 italic">"{form.shortDescription}"</p>}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 mt-4">
            <div className="flex gap-2">
              {!isFirst && <Button variant="outline" onClick={goBack}>Back</Button>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {!isLast ? (
                <Button onClick={goNext}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : program ? 'Update Program' : 'Create Program'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }: { label: string; value: unknown; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">{label}{required && ' *'}</label>
      <Input type={type} value={value == null ? '' : String(value)} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">{label}{required && ' *'}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm">
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm min-h-[80px]" />
    </div>
  );
}
