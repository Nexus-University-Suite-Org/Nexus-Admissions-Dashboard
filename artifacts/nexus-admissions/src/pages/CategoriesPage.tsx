import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { customFetch, setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, X, GripVertical } from 'lucide-react';

setBaseUrl('http://localhost:8080');
setAuthTokenGetter(() => localStorage.getItem('nap_admin_token') || '');

type ProgramCategory = {
  id: number; name: string; description: string; displayOrder: number;
  createdAt: string; programs: { id: number; programName: string; programCode: string; programType: string }[];
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<ProgramCategory | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-program-categories'],
    queryFn: () => customFetch<ProgramCategory[]>('/api/v1/admin/program-categories'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`/api/v1/admin/program-categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-program-categories'] }),
  });

  const openEdit = (c: ProgramCategory) => { setEditingCategory(c); setShowForm(true); };
  const openNew = () => { setEditingCategory(null); setShowForm(true); };

  if (showForm) {
    return <CategoryForm category={editingCategory} onClose={() => { setShowForm(false); setEditingCategory(null); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/programs">
            <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
          </Link>
          <div>
            <h1 className="nexus-serif text-2xl font-bold">Program Categories</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Organize programs into categories for the public portal.</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Add Category</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" size={24} /></div>
      ) : categories.length === 0 ? (
        <div className="nexus-card rounded-2xl border p-12 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No categories yet. Create one to organize your programs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(c => (
            <div key={c.id} className="nexus-card rounded-2xl border p-5">
              <div className="flex items-center gap-4">
                <GripVertical size={16} className="text-[hsl(var(--muted-foreground))] opacity-30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{c.name}</h3>
                    <span className="text-[10px] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full">{c.programs?.length || 0} programs</span>
                  </div>
                  {c.description && <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.description}</p>}
                  {c.programs && c.programs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.programs.map(p => (
                        <span key={p.id} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p.programName}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete "${c.name}"? Programs will not be deleted.`)) deleteMutation.mutate(c.id); }} className="text-red-500 hover:text-red-600"><Trash2 size={14} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryForm({ category, onClose }: { category: ProgramCategory | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [displayOrder, setDisplayOrder] = useState(category?.displayOrder || 0);

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; description: string; displayOrder: number }) => {
      if (category?.id) return customFetch(`/api/v1/admin/program-categories/${category.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return customFetch('/api/v1/admin/program-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-program-categories'] });
      onClose();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        <h1 className="nexus-serif text-2xl font-bold">{category ? 'Edit Category' : 'New Category'}</h1>
      </div>
      <div className="nexus-card rounded-2xl border p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Category Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engineering Programs" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm min-h-[60px]" placeholder="Optional description for this category" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Display Order</label>
          <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)} className="w-32" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate({ name, description, displayOrder })} disabled={!name.trim() || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : category ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </div>
  );
}
