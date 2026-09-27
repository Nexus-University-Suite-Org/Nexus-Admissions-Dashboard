import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/query-error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Crown,
  Users,
  CalendarRange,
  Coins,
  Search,
  AlertCircle,
  Scale,
} from "lucide-react";

const NAP_API = import.meta.env.VITE_NAP_API_BASE_URL ?? "http://localhost:8080";

type SchemeProgram = {
  id: number;
  programName: string;
  programCode: string;
  programType: string;
};
type AdmissionScheme = {
  id: number;
  schemeName: string;
  category: string;
  academicYear: string;
  intakeMonth: string;
  description: string;
  appOpenDate: string | null;
  appCloseDate: string | null;
  capacity: number | null;
  applicationFees: string;
  serviceFee: number | null;
  status: string;
  daysLeft: number | null;
  programCount: number;
  programs: SchemeProgram[];
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  oLevelWeight?: number | null;
  aLevelWeight?: number | null;
  bestOfOLevel?: number | null;
  passGradeThreshold?: string | null;
};

type Program = {
  id: number;
  programName: string;
  programCode: string;
  programType: string;
  status: string;
};

const AWARD_ORDER = ["BACHELOR", "DIPLOMA", "CERTIFICATE", "MASTER", "PHD"];
const AWARD_LABELS: Record<string, string> = {
  BACHELOR: "Bachelor Degrees",
  DIPLOMA: "Diplomas",
  CERTIFICATE: "Certificates",
  MASTER: "Master Degrees",
  PHD: "Doctorates (PhD)",
};

function awardTypeForScheme(programType: string | undefined) {
  const normalized = (programType || "BACHELOR").trim().toUpperCase();
  return normalized === "UNDERGRADUATE" ? "BACHELOR" : normalized;
}
// Derived rather than hardcoded so the picker never goes stale. The current
// Ugandan academic year runs February–January, so the year starting in 2026 is
// "2026/2027" once January has passed. We always offer one year either side of
// the current one so a scheme can be planned ahead or corrected afterwards.
const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const startYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return `${startYear}/${startYear + 1}`;
})();

const ACADEMIC_YEARS = (() => {
  const start = Number(CURRENT_ACADEMIC_YEAR.slice(0, 4));
  return [-1, 0, 1, 2, 3].map((offset) => `${start + offset}/${start + offset + 1}`);
})();

const O_LEVEL_SUBJECTS = 8;
const DEFAULT_O_WEIGHT = 40;
const DEFAULT_A_WEIGHT = 60;
const INTAKE_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function formatUGX(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return "UGX " + Number(n).toLocaleString("en-US");
}

// Colours are expressed as low-alpha token blends rather than fixed light-mode
// palette steps. A hardcoded `bg-emerald-100` stays a bright pastel in dark
// mode, which is why these were unreadable on the dark theme.
function statusColor(s: string) {
  if (s === "OPEN")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (s === "SCHEDULED")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (s === "CLOSED")
    return "bg-muted text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]";
  return "bg-muted text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]";
}

function toLocalDT(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDT(v: string) {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
}

export default function SchemesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdmissionScheme | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: schemes = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-schemes"],
    queryFn: () =>
      customFetch<AdmissionScheme[]>(`${NAP_API}/api/v1/admin/schemes`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`${NAP_API}/api/v1/admin/schemes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-schemes"] }),
  });

  const filtered = schemes.filter(
    (s) => !search || s.schemeName.toLowerCase().includes(search.toLowerCase()),
  );

  const fees = (raw: string) => parseJson<Record<string, number>>(raw, {});

  if (showForm) {
    return (
      <SchemeForm
        scheme={editing}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="nexus-serif text-2xl font-bold">Admission Schemes</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage the running admissions windows shown on the public
            application portal. Open a scheme to invite applications for any
            programme(s).
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus size={14} className="mr-1" /> New Scheme
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schemes..."
            className="pl-9"
          />
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] font-medium self-center">
          {filtered.length} of {schemes.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : isError ? (
        <QueryErrorState resource="admission schemes" error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <div className="nexus-card rounded-2xl border p-12 text-center">
          <Megaphone size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No admission schemes yet. Click <strong>New Scheme</strong> to open
            applications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const feeList = fees(s.applicationFees);
            const isOpen = s.status === "OPEN";
            return (
              <div
                key={s.id}
                className="nexus-card rounded-2xl border overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedId(expandedId === s.id ? null : s.id)
                  }
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-[hsl(var(--muted)/.3)] transition-colors cursor-pointer"
                >
                  <div
                    className={`shrink-0 flex size-11 items-center justify-center rounded-xl ${isOpen ? "bg-emerald-100 text-emerald-700" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
                  >
                    {isOpen ? (
                      <Megaphone size={20} />
                    ) : (
                      <CalendarRange size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">
                        {s.schemeName}
                      </h3>
                      {s.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(s.status)}`}
                      >
                        {s.status}
                      </span>
                      {isOpen && s.daysLeft != null && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.daysLeft === 0
                            ? "Closing today"
                            : `${s.daysLeft} day(s) left`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarRange size={12} /> {s.academicYear || "—"} ·{" "}
                        {s.intakeMonth || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {s.programCount} programme(s)
                      </span>
                      {s.capacity != null && <span>Capacity {s.capacity}</span>}
                      <span className="flex items-center gap-1">
                        <Coins size={12} /> {formatUGX(feeList.ugandan)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(s);
                        setShowForm(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete scheme "${s.schemeName}"?`))
                          deleteMutation.mutate(s.id);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                    {expandedId === s.id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </button>
                {expandedId === s.id && (
                  <div className="border-t border-[hsl(var(--border))] p-5 space-y-5 bg-[hsl(var(--muted)/.1)]">
                    {s.description && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {s.description}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1">
                          <Coins size={12} /> Application Fees
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Ugandan
                            </span>
                            <span className="font-semibold">
                              {formatUGX(feeList.ugandan)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              East African
                            </span>
                            <span className="font-semibold">
                              {formatUGX(feeList.eastAfrican)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Non East African
                            </span>
                            <span className="font-semibold">
                              {formatUGX(feeList.nonEastAfrican)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-[hsl(var(--border)/.6)] pt-1.5">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Service fee
                            </span>
                            <span className="font-semibold">
                              {formatUGX(s.serviceFee)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1">
                          <CalendarRange size={12} /> Window
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Opens
                            </span>
                            <span className="font-medium">
                              {s.appOpenDate
                                ? new Date(s.appOpenDate).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Closes
                            </span>
                            <span className="font-medium">
                              {s.appCloseDate
                                ? new Date(s.appCloseDate).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Capacity
                            </span>
                            <span className="font-medium">
                              {s.capacity ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1">
                          <Crown size={12} /> Programmes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.programs.length ? (
                            s.programs.map((p) => (
                              <span
                                key={p.id}
                                className="px-2 py-0.5 rounded-full bg-white border border-[hsl(var(--border))] text-[11px]"
                              >
                                {p.programName}
                              </span>
                            ))
                          ) : (
                            <span className="text-[hsl(var(--muted-foreground))]">
                              No programmes attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SchemeForm({
  scheme,
  onClose,
}: {
  scheme: AdmissionScheme | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    // Errors stay up longer: they usually need reading and acting on, whereas
    // a success banner is just confirmation that the form closed correctly.
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 8000 : 3000);
  };

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const {
    data: programs = [],
    isLoading: isLoadingPrograms,
  } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: () => customFetch<Program[]>(`${NAP_API}/api/v1/admin/programs`),
  });

  const existingFees = parseJson<Record<string, number>>(
    scheme?.applicationFees,
    {},
  );

  const [form, setForm] = useState({
    schemeName: scheme?.schemeName || "",
    category: scheme?.category || "",
    academicYear: scheme?.academicYear || "",
    intakeMonth: scheme?.intakeMonth || "",
    description: scheme?.description || "",
    appOpenDate: toLocalDT(scheme?.appOpenDate),
    appCloseDate: toLocalDT(scheme?.appCloseDate),
    capacity: scheme?.capacity != null ? String(scheme.capacity) : "",
    serviceFee: scheme?.serviceFee != null ? String(scheme.serviceFee) : "",
    ugandan: existingFees.ugandan != null ? String(existingFees.ugandan) : "",
    eastAfrican:
      existingFees.eastAfrican != null ? String(existingFees.eastAfrican) : "",
    nonEastAfrican:
      existingFees.nonEastAfrican != null
        ? String(existingFees.nonEastAfrican)
        : "",
    status: scheme?.status || "OPEN",
    oLevelWeight:
      scheme?.oLevelWeight != null ? String(scheme.oLevelWeight) : String(DEFAULT_O_WEIGHT),
    aLevelWeight:
      scheme?.aLevelWeight != null ? String(scheme.aLevelWeight) : String(DEFAULT_A_WEIGHT),
    bestOfOLevel:
      scheme?.bestOfOLevel != null ? String(scheme.bestOfOLevel) : String(O_LEVEL_SUBJECTS),
    passGradeThreshold: scheme?.passGradeThreshold || "C6",
  });
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    (scheme?.programs || []).map((p) => p.id),
  );
  const [programSearch, setProgramSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showDiscardWarning, setShowDiscardWarning] = useState(false);

  const initialSnapshot = useRef(
    JSON.stringify({ form, selectedIds }),
  );

  const weightTotal =
    (Number(form.oLevelWeight) || 0) + (Number(form.aLevelWeight) || 0);

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.schemeName.trim()) next.schemeName = "Give the scheme a name.";
    if (!form.category) next.category = "Choose the award type.";
    if (!form.academicYear) next.academicYear = "Choose an academic year.";
    if (!form.intakeMonth) next.intakeMonth = "Choose an intake month.";

    if (form.appOpenDate && form.appCloseDate) {
      if (new Date(form.appCloseDate) <= new Date(form.appOpenDate)) {
        next.appCloseDate = "Closing must be after opening.";
      }
    }

    const capacity = Number(form.capacity);
    if (form.capacity && (!Number.isFinite(capacity) || capacity < 1)) {
      next.capacity = "Capacity must be at least 1.";
    }

    for (const [key, label] of [
      ["ugandan", "Ugandan"],
      ["eastAfrican", "East African"],
      ["nonEastAfrican", "Non East African"],
      ["serviceFee", "Service fee"],
    ] as const) {
      const raw = form[key];
      if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
        next[key] = `${label} cannot be negative.`;
      }
    }

    const oWeight = Number(form.oLevelWeight);
    const aWeight = Number(form.aLevelWeight);
    if (
      form.oLevelWeight.trim() === "" ||
      !Number.isFinite(oWeight) ||
      oWeight < 0 ||
      oWeight > 100
    ) {
      next.oLevelWeight = "Enter a weight between 0 and 100.";
    }
    if (
      form.aLevelWeight.trim() === "" ||
      !Number.isFinite(aWeight) ||
      aWeight < 0 ||
      aWeight > 100
    ) {
      next.aLevelWeight = "Enter a weight between 0 and 100.";
    }
    if (!next.oLevelWeight && !next.aLevelWeight && Math.round(weightTotal) !== 100) {
      next.oLevelWeight = `Weights must total 100% (currently ${Math.round(weightTotal)}%).`;
    }

    const bestOf = Number(form.bestOfOLevel);
    if (
      form.bestOfOLevel.trim() === "" ||
      !Number.isInteger(bestOf) ||
      bestOf < 1 ||
      bestOf > O_LEVEL_SUBJECTS
    ) {
      next.bestOfOLevel = `Choose between 1 and ${O_LEVEL_SUBJECTS} O-level papers.`;
    }

    if (!form.passGradeThreshold.trim()) {
      next.passGradeThreshold = "Set the minimum pass grade.";
    }

    if (selectedIds.length === 0) {
      next.programIds = "Attach at least one programme.";
    }

    return next;
  };

  const isDirty =
    JSON.stringify({ form, selectedIds }) !== initialSnapshot.current;

  const grouped = AWARD_ORDER.map((award) => ({
    award,
    label: AWARD_LABELS[award],
    options: programs.filter(
      (p) =>
        awardTypeForScheme(p.programType) === award && p.status === "Active",
    ),
  })).filter((g) => g.options.length > 0);

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear a field's error as soon as the user edits it, so stale complaints
    // don't sit there next to a field they've already corrected.
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };
  const toggleProgram = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const body = JSON.stringify(data);
      if (scheme?.id)
        return customFetch(`${NAP_API}/api/v1/admin/schemes/${scheme.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
      return customFetch(`${NAP_API}/api/v1/admin/schemes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schemes"] });
      showToast(
        "success",
        scheme ? "Scheme updated successfully" : "Scheme created successfully",
      );
      setTimeout(onClose, 700);
    },
    onError: (err: unknown) => {
      // Previously this mutation had no onError at all, so a failed save just
      // stopped the spinner and said nothing. Surface whatever the server said.
      const message =
        (err as { message?: string })?.message ||
        "Could not save the scheme. Check your connection and try again.";
      showToast("error", message);
    },
  });

  const handleSubmit = () => {
    setSubmitAttempted(true);
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      showToast(
        "error",
        `Fix ${Object.keys(found).length} highlighted ${
          Object.keys(found).length === 1 ? "field" : "fields"
        } before saving.`,
      );
      return;
    }

    const applicationFees = JSON.stringify({
      ugandan: Number(form.ugandan) || 0,
      eastAfrican: Number(form.eastAfrican) || 0,
      nonEastAfrican: Number(form.nonEastAfrican) || 0,
    });
    saveMutation.mutate({
      schemeName: form.schemeName.trim(),
      category: form.category,
      academicYear: form.academicYear,
      intakeMonth: form.intakeMonth,
      description: form.description,
      appOpenDate: fromLocalDT(form.appOpenDate),
      appCloseDate: fromLocalDT(form.appCloseDate),
      capacity: form.capacity ? Number(form.capacity) : null,
      applicationFees,
      serviceFee: form.serviceFee ? Number(form.serviceFee) : 0,
      status: form.status,
      oLevelWeight: Number(form.oLevelWeight),
      aLevelWeight: Number(form.aLevelWeight),
      bestOfOLevel: Number(form.bestOfOLevel),
      passGradeThreshold: form.passGradeThreshold.trim(),
      programIds: selectedIds,
    });
  };

  const requestClose = () => {
    if (isDirty) {
      setShowDiscardWarning(true);
      return;
    }
    onClose();
  };

  const errorFor = (key: string) =>
    submitAttempted ? errors[key] : undefined;

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 flex items-start gap-2 max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-4 ${
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
          }`}
        >
          {toast.kind === "success" ? (
            <Check size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="ml-1 shrink-0 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={requestClose} aria-label="Close">
          <X size={16} />
        </Button>
        <div>
          <h1 className="nexus-serif text-2xl font-bold">
            {scheme ? "Edit Scheme" : "New Admission Scheme"}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Configure a running admissions window and pick which programme(s) it
            applies to.
          </p>
        </div>
      </div>

      <section className="nexus-card rounded-2xl border p-6 space-y-4">
        <SectionHeader
          icon={<Megaphone size={14} />}
          title="Basics"
          description="How this scheme is named and which intake it belongs to."
        />
        <Field
          label="Scheme Name"
          value={form.schemeName}
          onChange={(v) => set("schemeName", v)}
          placeholder="e.g. Undergraduate Admissions 2026/27"
          required
          error={errorFor("schemeName")}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Category / Award"
            value={form.category}
            onChange={(v) => set("category", v)}
            options={AWARD_ORDER}
            placeholder="Select award"
            required
            error={errorFor("category")}
          />
          <SelectField
            label="Academic Year"
            value={form.academicYear}
            onChange={(v) => set("academicYear", v)}
            options={ACADEMIC_YEARS}
            placeholder="Select year"
            required
            error={errorFor("academicYear")}
          />
          <SelectField
            label="Intake Month"
            value={form.intakeMonth}
            onChange={(v) => set("intakeMonth", v)}
            options={INTAKE_MONTHS}
            placeholder="Select month"
            required
            error={errorFor("intakeMonth")}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm min-h-[70px]"
            placeholder="Short description shown on the public portal..."
          />
          <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
            Optional. Applicants see this on the public scheme list.
          </p>
        </div>

      </section>

      <section className="nexus-card rounded-2xl border p-6 space-y-4">
        <SectionHeader
          icon={<CalendarRange size={14} />}
          title="Schedule"
          description="The window applicants can submit within, and how many places exist."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Application Opens"
            value={form.appOpenDate}
            onChange={(v) => set("appOpenDate", v)}
            type="datetime-local"
          />
          <Field
            label="Application Closes"
            value={form.appCloseDate}
            onChange={(v) => set("appCloseDate", v)}
            type="datetime-local"
            error={errorFor("appCloseDate")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Capacity"
            value={form.capacity}
            onChange={(v) => set("capacity", v.replace(/\D/g, ""))}
            type="number"
            min={1}
            placeholder="e.g. 500"
            error={errorFor("capacity")}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => set("status", v)}
            options={["OPEN", "SCHEDULED", "CLOSED"]}
          />
          <Field
            label="Service Fee (UGX)"
            value={form.serviceFee}
            onChange={(v) => set("serviceFee", v.replace(/\D/g, ""))}
            type="number"
            min={0}
            placeholder="e.g. 5000"
            error={errorFor("serviceFee")}
          />
        </div>

        <div className="rounded-xl bg-[hsl(var(--muted)/.35)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-1">
            <Coins size={12} /> Application Fees (UGX) per region
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Ugandan"
              value={form.ugandan}
              onChange={(v) => set("ugandan", v.replace(/\D/g, ""))}
              type="number"
              min={0}
              placeholder="e.g. 50000"
              error={errorFor("ugandan")}
            />
            <Field
              label="East African"
              value={form.eastAfrican}
              onChange={(v) => set("eastAfrican", v.replace(/\D/g, ""))}
              type="number"
              min={0}
              placeholder="e.g. 50000"
              error={errorFor("eastAfrican")}
            />
            <Field
              label="Non East African"
              value={form.nonEastAfrican}
              onChange={(v) => set("nonEastAfrican", v.replace(/\D/g, ""))}
              type="number"
              min={0}
              placeholder="e.g. 151500"
              error={errorFor("nonEastAfrican")}
            />
          </div>
        </div>
      </section>

      <section className="nexus-card rounded-2xl border p-6 space-y-4">
        <SectionHeader
          icon={<Scale size={14} />}
          title="Scoring Weighting"
          description="How the new admissions engine splits applicant scores between O-level and A-level results. Applies from the next scoring cycle onward."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="O-level Weight (%)"
            value={form.oLevelWeight}
            onChange={(v) => set("oLevelWeight", v.replace(/[^\d]/g, ""))}
            type="number"
            min={0}
            max={100}
            required
            error={errorFor("oLevelWeight")}
          />
          <Field
            label="A-level Weight (%)"
            value={form.aLevelWeight}
            onChange={(v) => set("aLevelWeight", v.replace(/[^\d]/g, ""))}
            type="number"
            min={0}
            max={100}
            required
            error={errorFor("aLevelWeight")}
          />
        </div>

        <p
          className={`text-xs flex items-center gap-1.5 ${
            Math.round(weightTotal) === 100
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-700 dark:text-red-400"
          }`}
        >
          {Math.round(weightTotal) === 100 ? (
            <Check size={13} />
          ) : (
            <AlertCircle size={13} />
          )}
          Weights total {Math.round(weightTotal)}% (must equal 100%).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Best N O-level Papers"
            value={form.bestOfOLevel}
            onChange={(v) => set("bestOfOLevel", v)}
            options={Array.from({ length: O_LEVEL_SUBJECTS }, (_, i) =>
              String(i + 1),
            )}
            required
            error={errorFor("bestOfOLevel")}
          />
          <Field
            label="Minimum Pass Grade"
            value={form.passGradeThreshold}
            onChange={(v) => set("passGradeThreshold", v)}
            placeholder="e.g. C6"
            required
            error={errorFor("passGradeThreshold")}
          />
        </div>
      </section>

      <section className="nexus-card rounded-2xl border p-6 space-y-4">
        <SectionHeader
          icon={<Users size={14} />}
          title="Programmes"
          description="Choose which programmes this scheme applies to. Grouped by award type."
        />
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-2 mb-3">
            Select Programme(s){" "}
            <span className="text-[hsl(var(--primary))]">*</span>{" "}
            {selectedIds.length > 0
              ? `${selectedIds.length} selected.`
              : "Choose at least one programme."}
          </p>
          {errorFor("programIds") && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle size={13} /> {errorFor("programIds")}
            </p>
          )}
          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
            />
            <Input
              value={programSearch}
              onChange={(e) => setProgramSearch(e.target.value)}
              placeholder="Search programmes by name or code..."
              aria-label="Search programmes"
              className="pl-9 text-sm"
            />
          </div>
          <div className="space-y-4">
            {grouped.map((g) => (
              <div
                key={g.award}
                className="border border-[hsl(var(--border))] rounded-xl overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-[hsl(var(--muted)/.35)] text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                  <span>{g.label}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {g.options.length} available ·{" "}
                    {g.options.filter((p) => selectedIds.includes(p.id)).length}{" "}
                    selected
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                  {g.options
                    .filter((p) => {
                      const query = programSearch.trim().toLowerCase();
                      return (
                        !query ||
                        p.programName.toLowerCase().includes(query) ||
                        p.programCode.toLowerCase().includes(query)
                      );
                    })
                    .map((p) => {
                      const checked = selectedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProgram(p.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${checked ? "bg-[hsl(var(--primary)/.12)] text-[hsl(var(--foreground))]" : "hover:bg-[hsl(var(--muted)/.5)]"}`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded border ${checked ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white" : "border-[hsl(var(--border))]"}`}
                          >
                            {checked && <Check size={11} />}
                          </span>
                          <span className="truncate">{p.programName}</span>
                          {p.programCode && (
                            <span className="ml-auto text-[10px] font-mono bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded shrink-0">
                              {p.programCode}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
            {isLoadingPrograms && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[hsl(var(--muted-foreground))]">
                <Loader2 size={16} className="animate-spin" />
                Loading active programmes...
              </div>
            )}
            {!isLoadingPrograms && grouped.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                No active programmes found to attach. Create an active programme
                first, then come back to this scheme.
              </p>
            )}
            {!isLoadingPrograms && programs.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                The programme list is empty. This usually means the request to
                the admissions backend failed — check that the backend is running
                and that you are signed in as an administrator.
              </p>
            )}
          </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={requestClose}
          disabled={saveMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="animate-spin" size={14} />
          ) : null}
          {scheme ? "Update Scheme" : "Create Scheme"}
        </Button>
      </div>

      {showDiscardWarning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="nexus-card w-full max-w-sm rounded-2xl border p-6 space-y-4">
            <h2 id="discard-title" className="nexus-serif text-lg font-bold">
              Discard unsaved changes?
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              This scheme has edits that have not been saved. Leaving now discards
              them.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardWarning(false)}
              >
                Keep editing
              </Button>
              <Button type="button" onClick={onClose}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[hsl(var(--border))] pb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-[hsl(var(--primary))]">{icon}</span>
        {title}
      </h2>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  error,
  min,
  max,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  min?: number;
  max?: number;
}) {
  const inputId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]"
      >
        {label}
        {required && <span className="text-[hsl(var(--primary))]"> *</span>}
      </label>
      <Input
        id={inputId}
        type={type}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`text-sm ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400"
        >
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const inputId = `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]"
      >
        {label}
        {required && <span className="text-[hsl(var(--primary))]"> *</span>}
      </label>
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={false}
      >
        <SelectTrigger
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`text-sm ${
            error
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
          } ${value ? "" : "text-[hsl(var(--muted-foreground))]"}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-sm">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400"
        >
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}
