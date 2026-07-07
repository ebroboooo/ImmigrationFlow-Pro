import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Task, TaskType, TaskPriority, TaskStatus } from '../../domain/models/Sales';
import {
  Plus, Calendar as CalendarIcon, Clock, CheckSquare, Eye, Pencil, Copy, Trash2,
  UserCheck, Flag, ListTodo,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { design } from '../../lib/design';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ActionMenu } from '../components/ui/ActionMenu';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

const TASK_TYPES: TaskType[] = ['Prepare Form', 'Review Evidence', 'File USCIS', 'Response to RFE', 'Consultation', 'Call', 'Email', 'Meeting', 'Custom'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

const EMPTY_FORM = { title: '', type: 'Call' as TaskType, priority: 'Medium' as TaskPriority, dueDate: '', description: '', assignedUserId: '' };

export const Tasks = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [assignTarget, setAssignTarget] = useState<Task | null>(null);
  const [priorityTarget, setPriorityTarget] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [data, userData] = await Promise.all([
          repos.tasks.getAll(tenantId),
          repos.users.getAll(tenantId),
        ]);
        setTasks(data.sort((a, b) => {
          if (a.status === 'Completed' && b.status !== 'Completed') return 1;
          if (a.status !== 'Completed' && b.status === 'Completed') return -1;
          return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
        }));
        setUsers(userData.map((u) => ({ id: u.id, name: u.name })));
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, assignedUserId: user?.id ?? '' });
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      type: task.type,
      priority: task.priority,
      dueDate: task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '',
      description: task.description,
      assignedUserId: task.assignedUserId ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editingTask) {
      const updated = await repos.tasks.update(editingTask.id, {
        title: form.title.trim(),
        type: form.type,
        priority: form.priority,
        description: form.description,
        assignedUserId: form.assignedUserId || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        updatedAt: new Date(),
      });
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      showToast('Task saved.');
    } else {
      const newTask = await repos.tasks.create({
        tenantId,
        title: form.title.trim(),
        type: form.type,
        priority: form.priority,
        status: 'Todo',
        description: form.description,
        assignedUserId: form.assignedUserId || user?.id,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setTasks([newTask, ...tasks]);
      showToast('Task added.');
    }
    setShowModal(false);
    setEditingTask(null);
  };

  const setStatus = async (task: Task, status: TaskStatus) => {
    const updated = await repos.tasks.update(task.id, { status, updatedAt: new Date() });
    setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    showToast(status === 'Completed' ? 'Task marked complete.' : 'Task marked pending.');
  };

  const duplicateTask = async (task: Task) => {
    const copy = await repos.tasks.create({
      tenantId,
      title: `${task.title} (Copy)`,
      type: task.type,
      priority: task.priority,
      status: 'Todo',
      description: task.description,
      assignedUserId: task.assignedUserId,
      dueDate: task.dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setTasks([copy, ...tasks]);
    showToast('Task duplicated.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await repos.tasks.delete(deleteTarget.id);
    setTasks(tasks.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast('Task deleted.');
  };

  const handleAssign = async (userId: string) => {
    if (!assignTarget) return;
    const updated = await repos.tasks.update(assignTarget.id, { assignedUserId: userId, updatedAt: new Date() });
    setTasks(tasks.map((t) => (t.id === assignTarget.id ? updated : t)));
    setAssignTarget(null);
    showToast('Staff assigned.');
  };

  const handlePriority = async (priority: TaskPriority) => {
    if (!priorityTarget) return;
    const updated = await repos.tasks.update(priorityTarget.id, { priority, updatedAt: new Date() });
    setTasks(tasks.map((t) => (t.id === priorityTarget.id ? updated : t)));
    setPriorityTarget(null);
    showToast('Priority updated.');
  };

  const filteredTasks = tasks.filter((t) => filter === 'All' || t.status === filter);

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400';
    if (priority === 'Medium') return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400';
    return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400';
  };

  const taskMenuItems = (task: Task) => [
    { label: 'View Details', icon: Eye, onClick: () => setViewTask(task) },
    { label: 'Edit Task', icon: Pencil, onClick: () => openEdit(task) },
    { label: 'Mark Complete', icon: CheckSquare, onClick: () => void setStatus(task, 'Completed'), disabled: task.status === 'Completed' },
    { label: 'Mark Pending', icon: ListTodo, onClick: () => void setStatus(task, 'Todo'), disabled: task.status !== 'Completed' },
    { label: 'Assign User', icon: UserCheck, onClick: () => setAssignTarget(task) },
    { label: 'Set Priority', icon: Flag, onClick: () => setPriorityTarget(task) },
    { label: 'Duplicate Task', icon: Copy, onClick: () => void duplicateTask(task) },
    { label: 'Delete Task', icon: Trash2, destructive: true, onClick: () => setDeleteTarget(task) },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className={cn(design.page, 'max-w-5xl mx-auto')}>
      <PageHeader
        title="Tasks"
        description="Your to-do list for cases, calls, and deadlines."
        icon={CheckSquare}
        action={
          <button type="button" onClick={openCreate} className={cn(design.btn.primary, 'w-full sm:w-auto')}>
            <Plus className="w-4 h-4" /> Add Task
          </button>
        }
      />

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-full sm:w-max overflow-x-auto hide-scrollbar">
        {(['All', 'Todo', 'In Progress', 'Completed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-11',
              filter === f ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {f === 'All' ? 'All Tasks' : f}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks here" description="Add a task to stay on top of your work." actionLabel="Add Task" onAction={openCreate} />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className={cn('glass-card p-4 flex items-start gap-3 transition-all', task.status === 'Completed' && 'opacity-70')}>
              <input
                type="checkbox"
                checked={task.status === 'Completed'}
                onChange={() => void setStatus(task, task.status === 'Completed' ? 'Todo' : 'Completed')}
                aria-label={`Mark ${task.title} complete`}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 min-h-[20px] min-w-[20px]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={cn('text-base font-medium text-gray-900 dark:text-white', task.status === 'Completed' && 'line-through text-gray-500')}>
                    {task.title}
                  </h3>
                  <span className={cn('px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0', getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                </div>
                {task.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{task.type}</span>
                  {task.dueDate && (
                    <span className={cn('flex items-center gap-1', task.dueDate < new Date() && task.status !== 'Completed' && 'text-rose-500')}>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Due {format(task.dueDate, 'MMM d, yyyy')}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.status}</span>
                  {task.assignedUserId && (
                    <span>{users.find((u) => u.id === task.assignedUserId)?.name ?? 'Assigned'}</span>
                  )}
                </div>
              </div>
              <ActionMenu items={taskMenuItems(task)} ariaLabel={`Actions for ${task.title}`} />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className={cn(design.btn.secondary, 'flex-1')}>Cancel</button>
            <button type="button" onClick={() => void handleSave()} className={cn(design.btn.primary, 'flex-1')}>Save</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Task Title *</label>
            <input type="text" placeholder="e.g. Prepare I-130 package" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={design.input} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })} className={design.input}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} className={design.input}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={design.input} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Assigned To</label>
            <select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })} className={design.input}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={design.input} />
          </div>
        </div>
      </Modal>

      <Modal open={!!viewTask} onClose={() => setViewTask(null)} title={viewTask?.title ?? 'Task Details'}>
        {viewTask && (
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{viewTask.type}</dd></div>
            <div><dt className="text-gray-500">Priority</dt><dd className="font-medium">{viewTask.priority}</dd></div>
            <div><dt className="text-gray-500">Status</dt><dd className="font-medium">{viewTask.status}</dd></div>
            {viewTask.dueDate && <div><dt className="text-gray-500">Due</dt><dd className="font-medium">{format(viewTask.dueDate, 'MMM d, yyyy')}</dd></div>}
            {viewTask.description && <div><dt className="text-gray-500">Notes</dt><dd>{viewTask.description}</dd></div>}
          </dl>
        )}
      </Modal>

      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign Staff">
        <div className="space-y-2">
          {users.map((u) => (
            <button key={u.id} type="button" onClick={() => void handleAssign(u.id)} className={cn(design.btn.secondary, 'w-full justify-start')}>
              {u.name}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!priorityTarget} onClose={() => setPriorityTarget(null)} title="Set Priority">
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button key={p} type="button" onClick={() => void handlePriority(p)} className={cn(design.btn.secondary, 'flex-1')}>{p}</button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Task?"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
