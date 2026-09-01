import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { customFetch, setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, Search, GraduationCap, BookOpen, ChevronDown, ChevronRight, X, GripVertical } from 'lucide-react';

setBaseUrl('http://localhost:8080');
setAuthTokenGetter(() => localStorage.getItem('nap_admin_token') || '');

type Program = {
  id: number; programName: string; programCode: string; programType: string;
  awardQualification: string; programDescription: string; programObjectives: string;
  learningOutcomes: string; careerOpportunities: string; status: string;
  facultySchool: string; department: string; programCoordinator: string; campus: string;
  duration: number; durationUnit: string; numberOfYears: number; numberOfSemesters: number;
  semestersPerYear: number; totalCreditUnits: number; studyMode: string; academicCalendar: string;
  fees: string; admissionRequirements: string; curriculum: string; intakes: string;
  studyOptions: string; accreditation: string; documents: string;
  imageUrl: string; shortDescription: string; fullDescription: string;
  featured: boolean; displayOrder: number; createdBy: string; createdAt: string;
  updatedBy: string; updatedAt: string; categoryNames: string[];
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
    queryFn: () => customFetch<Program[]>('/api/v1/admin/programs'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-program-categories'],
    queryFn: () => customFetch<ProgramCategory[]>('/api/v1/admin/program-categories'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`/api/v1/admin/programs/${id}`, { method: 'DELETE' }),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nexus-serif text-2xl font-bold">Programs</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage all academic programs offered by your institution.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/programs/categories">
            <Button variant="outline" size="sm"><BookOpen size={14} className="mr-1" /> Categories</Button>
          </Link>
          <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Add Program</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programs..." className="pl-9" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm">
          <option value="">All Types</option>
          {PROGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="nexus-card rounded-2xl border p-12 text-center">
          <GraduationCap size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No programs found.</p>
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
                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                    {p.facultySchool && <span>{p.facultySchool}</span>}
                    {p.duration && <span>{p.duration} {p.durationUnit || 'years'}</span>}
                    {p.totalCreditUnits && <span>{p.totalCreditUnits} credits</span>}
                    {p.studyMode && <span>{p.studyMode}</span>}
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
                    const fees = parseJson(p.fees, {} as Record<string, unknown>);
                    return fees.total ? (
                      <div className="text-xs"><span className="text-[hsl(var(--muted-foreground))]">Total Fee:</span> <span className="font-semibold">{fees.currency || ''} {String(fees.total)}</span></div>
                    ) : null;
                  })()}
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
  const [section, setSection] = useState<'basic' | 'org' | 'duration' | 'fees' | 'admission' | 'curriculum' | 'intakes' | 'accreditation' | 'documents' | 'presentation'>('basic');

  const [form, setForm] = useState({
    programName: program?.programName || '', programCode: program?.programCode || '', programType: program?.programType || '',
    awardQualification: program?.awardQualification || '', programDescription: program?.programDescription || '',
    programObjectives: program?.programObjectives || '', learningOutcomes: program?.learningOutcomes || '',
    careerOpportunities: program?.careerOpportunities || '', status: program?.status || 'Active',
    facultySchool: program?.facultySchool || '', department: program?.department || '',
    programCoordinator: program?.programCoordinator || '', campus: program?.campus || '',
    duration: program?.duration || 0, durationUnit: program?.durationUnit || 'Years',
    numberOfYears: program?.numberOfYears || 1, numberOfSemesters: program?.numberOfSemesters || 2,
    semestersPerYear: program?.semestersPerYear || 2, totalCreditUnits: program?.totalCreditUnits || 0,
    studyMode: program?.studyMode || '', academicCalendar: program?.academicCalendar || 'Semester',
    imageUrl: program?.imageUrl || '', shortDescription: program?.shortDescription || '',
    fullDescription: program?.fullDescription || '', featured: program?.featured || false,
    displayOrder: program?.displayOrder || 0,
  });

  const [fees, setFees] = useState(() => parseJson(program?.fees, { tuition: 0, registration: 0, examination: 0, functional: 0, ict: 0, library: 0, medical: 0, accommodation: 0, other: 0, total: 0, currency: 'UGX', fee_structure: {} as Record<string, Record<string, number>> }));
  const [admissionReq, setAdmissionReq] = useState(() => parseJson(program?.admissionRequirements, { min_qualification: '', min_grade: '', required_subjects: '', min_points: '', direct_entry: '', diploma_entry: '', mature_age_entry: '', international: '', other: '' }));
  const [curriculum, setCurriculum] = useState(() => parseJson(program?.curriculum, { curriculum_name: '', version: '', academic_year: '', total_credit_units: 0, years: [] as { year: number; semesters: { semester: number; courses: { code: string; name: string; credits: number; type: string; prerequisites: string }[] }[] }[] }));
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
      if (program?.id) return customFetch(`/api/v1/admin/programs/${program.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return customFetch('/api/v1/admin/programs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    },
    onSuccess: async (saved: Program) => {
      // Sync categories
      if (program?.id) {
        const currentCats = categories.filter(c => c.programs.some(p => p.id === program.id)).map(c => c.id);
        for (const catId of currentCats) {
          if (!selectedCategoryIds.includes(catId)) {
            await customFetch(`/api/v1/admin/programs/${program.id}/categories/${catId}`, { method: 'DELETE' });
          }
        }
      }
      for (const catId of selectedCategoryIds) {
        await customFetch(`/api/v1/admin/programs/${saved.id}/categories/${catId}`, { method: 'POST' });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-program-categories'] });
      onClose();
    },
  });

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const addYear = () => {
    const newYear = { year: curriculum.years.length + 1, semesters: [] as typeof curriculum.years[0]['semesters'] };
    for (let s = 1; s <= (form.semestersPerYear || 2); s++) {
      newYear.semesters.push({ semester: s, courses: [] });
    }
    setCurriculum(c => ({ ...c, years: [...c.years, newYear] }));
    set('numberOfYears', curriculum.years.length + 1);
  };

  const addCourse = (yearIdx: number, semIdx: number) => {
    setCurriculum(c => {
      const next = { ...c, years: c.years.map((y, yi) => yi === yearIdx ? { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, courses: [...s.courses, { code: '', name: '', credits: 0, type: 'Core', prerequisites: '' }] } : s) } : y) };
      return next;
    });
  };

  const updateCourse = (yearIdx: number, semIdx: number, courseIdx: number, field: string, value: unknown) => {
    setCurriculum(c => {
      const next = { ...c, years: c.years.map((y, yi) => yi === yearIdx ? { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, courses: s.courses.map((cr, cri) => cri === courseIdx ? { ...cr, [field]: value } : cr) } : s) } : y) };
      return next;
    });
  };

  const removeCourse = (yearIdx: number, semIdx: number, courseIdx: number) => {
    setCurriculum(c => {
      const next = { ...c, years: c.years.map((y, yi) => yi === yearIdx ? { ...y, semesters: y.semesters.map((s, si) => si === semIdx ? { ...s, courses: s.courses.filter((_, cri) => cri !== courseIdx) } : s) } : y) };
      return next;
    });
  };

  const sections = [
    { key: 'basic', label: 'Basic Info' }, { key: 'org', label: 'Organization' },
    { key: 'duration', label: 'Duration' }, { key: 'fees', label: 'Fees' },
    { key: 'admission', label: 'Admission' }, { key: 'curriculum', label: 'Curriculum' },
    { key: 'intakes', label: 'Intakes' }, { key: 'accreditation', label: 'Accreditation' },
    { key: 'documents', label: 'Documents' }, { key: 'presentation', label: 'Presentation' },
  ] as const;

  const handleSubmit = () => {
    saveMutation.mutate({ ...form, fees, admissionRequirements: admissionReq, curriculum, intakes: intakesList, accreditation, documents: documentsList });
  };

  const sectionKeys = sections.map(s => s.key);
  const currentIdx = sectionKeys.indexOf(section);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === sectionKeys.length - 1;
  const goNext = () => { if (!isLast) setSection(sectionKeys[currentIdx + 1]); };
  const goBack = () => { if (!isFirst) setSection(sectionKeys[currentIdx - 1]); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        <h1 className="nexus-serif text-2xl font-bold">{program ? 'Edit Program' : 'New Program'}</h1>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[hsl(var(--border))] pb-2">
        {sections.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${section === s.key ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}>{s.label}</button>
        ))}
      </div>

      <div className="nexus-card rounded-2xl border p-6 space-y-4">
        {section === 'basic' && (
          <>
            <Field label="Program Name" value={form.programName} onChange={v => set('programName', v)} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Program Code" value={form.programCode} onChange={v => set('programCode', v)} placeholder="e.g. BSC-CS" />
              <SelectField label="Program Type" value={form.programType} onChange={v => set('programType', v)} options={PROGRAM_TYPES} />
            </div>
            <Field label="Award / Qualification" value={form.awardQualification} onChange={v => set('awardQualification', v)} />
            <TextareaField label="Program Description" value={form.programDescription} onChange={v => set('programDescription', v)} />
            <TextareaField label="Program Objectives" value={form.programObjectives} onChange={v => set('programObjectives', v)} />
            <TextareaField label="Learning Outcomes" value={form.learningOutcomes} onChange={v => set('learningOutcomes', v)} />
            <TextareaField label="Career Opportunities" value={form.careerOpportunities} onChange={v => set('careerOpportunities', v)} />
            <SelectField label="Status" value={form.status} onChange={v => set('status', v)} options={STATUSES} />
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
              <Field label="Duration" value={form.duration} onChange={v => set('duration', parseInt(v) || 0)} type="number" />
              <SelectField label="Duration Unit" value={form.durationUnit} onChange={v => set('durationUnit', v)} options={DURATION_UNITS} />
              <Field label="Number of Years" value={form.numberOfYears} onChange={v => set('numberOfYears', parseInt(v) || 1)} type="number" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Number of Semesters" value={form.numberOfSemesters} onChange={v => set('numberOfSemesters', parseInt(v) || 2)} type="number" />
              <Field label="Semesters Per Year" value={form.semestersPerYear} onChange={v => set('semestersPerYear', parseInt(v) || 2)} type="number" />
              <Field label="Total Credit Units" value={form.totalCreditUnits} onChange={v => set('totalCreditUnits', parseInt(v) || 0)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Study Mode" value={form.studyMode} onChange={v => set('studyMode', v)} options={STUDY_MODES} />
              <SelectField label="Academic Calendar" value={form.academicCalendar} onChange={v => set('academicCalendar', v)} options={CALENDARS} />
            </div>
          </>
        )}
        {section === 'fees' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tuition Fee" value={fees.tuition} onChange={v => setFees(f => ({ ...f, tuition: parseFloat(v) || 0, total: (parseFloat(v) || 0) + f.registration + f.examination + f.functional + f.ict + f.library + f.medical + f.accommodation + f.other }))} type="number" />
              <Field label="Registration Fee" value={fees.registration} onChange={v => setFees(f => ({ ...f, registration: parseFloat(v) || 0 }))} type="number" />
              <Field label="Examination Fee" value={fees.examination} onChange={v => setFees(f => ({ ...f, examination: parseFloat(v) || 0 }))} type="number" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Functional Fee" value={fees.functional} onChange={v => setFees(f => ({ ...f, functional: parseFloat(v) || 0 }))} type="number" />
              <Field label="ICT / Technology Fee" value={fees.ict} onChange={v => setFees(f => ({ ...f, ict: parseFloat(v) || 0 }))} type="number" />
              <Field label="Library Fee" value={fees.library} onChange={v => setFees(f => ({ ...f, library: parseFloat(v) || 0 }))} type="number" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Medical Fee" value={fees.medical} onChange={v => setFees(f => ({ ...f, medical: parseFloat(v) || 0 }))} type="number" />
              <Field label="Accommodation Fee" value={fees.accommodation} onChange={v => setFees(f => ({ ...f, accommodation: parseFloat(v) || 0 }))} type="number" />
              <Field label="Other Fees" value={fees.other} onChange={v => setFees(f => ({ ...f, other: parseFloat(v) || 0 }))} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Currency" value={fees.currency} onChange={v => setFees(f => ({ ...f, currency: v }))} />
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] px-4 py-3">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Total Fee</span>
                <p className="text-lg font-bold">{fees.currency} {fees.total.toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
        {section === 'admission' && (
          <>
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
        {section === 'curriculum' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Curriculum Name" value={curriculum.curriculum_name} onChange={v => setCurriculum(c => ({ ...c, curriculum_name: v }))} />
              <Field label="Version" value={curriculum.version} onChange={v => setCurriculum(c => ({ ...c, version: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Academic Year" value={curriculum.academic_year} onChange={v => setCurriculum(c => ({ ...c, academic_year: v }))} />
              <Field label="Total Credit Units" value={curriculum.total_credit_units} onChange={v => setCurriculum(c => ({ ...c, total_credit_units: parseInt(v) || 0 }))} type="number" />
            </div>
            {curriculum.years.map((year, yi) => (
              <div key={yi} className="border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><BookOpen size={14} /> Year {year.year}</h4>
                {year.semesters.map((sem, si) => (
                  <div key={si} className="ml-4 space-y-2">
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Semester {sem.semester}</p>
                    {sem.courses.map((cr, cri) => (
                      <div key={cri} className="flex items-center gap-2 ml-4">
                        <Input value={cr.code} onChange={e => updateCourse(yi, si, cri, 'code', e.target.value)} placeholder="Code" className="w-24 text-xs" />
                        <Input value={cr.name} onChange={e => updateCourse(yi, si, cri, 'name', e.target.value)} placeholder="Course Name" className="flex-1 text-xs" />
                        <Input value={cr.credits} onChange={e => updateCourse(yi, si, cri, 'credits', parseInt(e.target.value) || 0)} type="number" placeholder="Cr" className="w-16 text-xs" />
                        <select value={cr.type} onChange={e => updateCourse(yi, si, cri, 'type', e.target.value)} className="text-xs border border-[hsl(var(--border))] rounded-lg px-2 py-1 bg-transparent">
                          <option value="Core">Core</option><option value="Elective">Elective</option>
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => removeCourse(yi, si, cri)} className="text-red-500 p-1"><X size={12} /></Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addCourse(yi, si)} className="ml-4 text-xs"><Plus size={12} className="mr-1" /> Add Course</Button>
                  </div>
                ))}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addYear}><Plus size={14} className="mr-1" /> Add Year</Button>
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
      </div>

      <div className="flex justify-between gap-3">
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
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }: { label: string; value: unknown; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">{label}{required && ' *'}</label>
      <Input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm">
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
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
