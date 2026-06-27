import { useState, useEffect } from 'react';
import { useRepositories } from '../contexts/RepositoryContext';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskType, TaskPriority } from '../../domain/models/Sales';
import { Plus, Calendar as CalendarIcon, Clock, MoreVertical, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const TASK_TYPES: TaskType[] = ['Prepare Form', 'Review Evidence', 'File USCIS', 'Response to RFE', 'Consultation', 'Call', 'Email', 'Meeting', 'Custom'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

export const Tasks = () => {
  const { tenantId, user } = useAuth();
  const repos = useRepositories();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Todo' | 'In Progress' | 'Completed'>('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'Call' as TaskType, priority: 'Medium' as TaskPriority, dueDate: '', description: '' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await repos.tasks.getAll(tenantId);
        setTasks(data.sort((a: Task, b: Task) => {
          if (a.status === 'Completed' && b.status !== 'Completed') return 1;
          if (a.status !== 'Completed' && b.status === 'Completed') return -1;
          return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleCreate = async () => {
    if (!form.title) return;
    const newTask = await repos.tasks.create({
      tenantId, title: form.title, type: form.type, priority: form.priority,
      status: 'Todo', description: form.description,
      assignedUserId: user?.id,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      createdAt: new Date(), updatedAt: new Date()
    });
    setTasks([newTask, ...tasks]);
    setShowModal(false);
    setForm({ title: '', type: 'Call', priority: 'Medium', dueDate: '', description: '' });
  };

  const toggleTaskCompletion = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Todo' : 'Completed';
    try {
      await repos.tasks.update(task.id, { status: newStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e) { console.error(e); }
  };

  const filteredTasks = tasks.filter(t => filter === 'All' ? true : t.status === filter);

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400';
    if (priority === 'Medium') return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400';
    return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400';
  };

  if (loading) return <div className="p-8 text-gray-500">Loading tasks...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">My Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your to-dos and upcoming activities.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg w-max">
        {['All', 'Todo', 'In Progress', 'Completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === f 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No tasks found in this view.
          </div>
        ) : filteredTasks.map(task => (
          <div 
            key={task.id} 
            className={cn(
              "glass-card p-4 flex items-start gap-4 group transition-all",
              task.status === 'Completed' ? "opacity-60" : ""
            )}
          >
            <input 
              type="checkbox" 
              checked={task.status === 'Completed'}
              onChange={() => toggleTaskCompletion(task)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-transparent dark:border-gray-600" 
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <h3 className={cn("text-base font-medium text-gray-900 dark:text-white", task.status === 'Completed' && "line-through text-gray-500 dark:text-gray-500")}>
                  {task.title}
                </h3>
                <span className={cn("px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap", getPriorityColor(task.priority))}>
                  {task.priority} Priority
                </span>
              </div>
              
              {task.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {task.description}
                </p>
              )}
              
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"></span>
                  {task.type}
                </div>
                
                {task.dueDate && (
                  <div className={cn("flex items-center gap-1.5", 
                    task.dueDate < new Date() && task.status !== 'Completed' ? "text-rose-500 dark:text-rose-400" : ""
                  )}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {format(task.dueDate, 'MMM d, yyyy')}
                  </div>
                )}
                
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {task.status}
                </div>
              </div>
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Task</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title *</label>
                <input type="text" placeholder="e.g. Prepare I-130 Package" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as TaskType })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

