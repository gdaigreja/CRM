import React, { useState, useMemo, useEffect } from 'react';
import { Task, Lead } from '../../../shared/types';
import { cn } from '../../../shared/utils';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Search, 
  Calendar, 
  Flag, 
  Trash2, 
  Clock,
  Filter,
  MoreVertical,
  ChevronRight,
  AlertCircle,
  Users,
  List,
  Columns as ColumnsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';

interface TasksProps {
  leads: Lead[];
  externalFilters?: {
    searchQuery: string;
    filterStatus: 'todos' | 'pendente' | 'em_andamento' | 'concluida';
    view: 'list' | 'kanban';
    triggerNewTask: number;
  };
  onTriggerConsumed?: () => void;
}

const DraggableAny = Draggable as any;
const DroppableAny = Droppable as any;

export default function Tasks({ leads, externalFilters, onTriggerConsumed }: TasksProps) {
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'em_andamento' | 'concluida'>('todos');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    priority: 'media',
    status: 'pendente'
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTasks(data);
        }
      } catch (e) {
        console.error("Error fetching tasks", e);
      }
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    if (externalFilters) {
      setView(externalFilters.view);
      setSearchQuery(externalFilters.searchQuery);
      setFilterStatus(externalFilters.filterStatus);
    }
  }, [externalFilters]);

  useEffect(() => {
    if (externalFilters?.triggerNewTask) {
      setShowNewTaskModal(true);
      onTriggerConsumed?.();
    }
  }, [externalFilters?.triggerNewTask, onTriggerConsumed]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'todos' || task.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (a.status !== b.status) {
        const order = { 'pendente': 0, 'em_andamento': 1, 'concluida': 2 };
        return order[a.status] - order[b.status];
      }
      return new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
    });
  }, [tasks, searchQuery, filterStatus]);

  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let nextStatus: Task['status'] = 'pendente';
    if (task.status === 'pendente') nextStatus = 'em_andamento';
    else if (task.status === 'em_andamento') nextStatus = 'concluida';
    else nextStatus = 'pendente';

    const updatedTask = { ...task, status: nextStatus };
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedTask)
      });
    } catch (e) {
      console.error("Error toggling task status", e);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Task['status'];
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    const updatedTask = { ...task, status: newStatus };
    setTasks(prev => prev.map(t => t.id === draggableId ? updatedTask : t));

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/tasks/${draggableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedTask)
      });
    } catch (e) {
      console.error("Error updating task status via drag", e);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Error deleting task", e);
    }
  };

  const handleSaveTask = async () => {
    if (!newTask.title) return;
    
    const token = localStorage.getItem('token');
    if (editingTask) {
      const updatedTask = { ...editingTask, ...newTask } as Task;
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));

      try {
        await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedTask)
        });
      } catch (e) {
        console.error("Error updating task", e);
      }
    } else {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority as any,
        status: (newTask.status as Task['status']) || 'pendente',
        dueDate: newTask.dueDate,
        leadId: newTask.leadId
      };

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(taskData)
        });
        if (response.ok) {
          const savedTask = await response.json();
          setTasks(prev => [savedTask, ...prev]);
        }
      } catch (e) {
        console.error("Error creating task", e);
      }
    }

    setShowNewTaskModal(false);
    setEditingTask(null);
    setNewTask({ priority: 'media', status: 'pendente' });
    setClientSearchQuery('');
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask(task);
    const lead = leads.find(l => l.id === task.leadId);
    setClientSearchQuery(lead ? lead.name : '');
    setShowNewTaskModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'text-rose-500 bg-rose-50';
      case 'media': return 'text-amber-500 bg-amber-50';
      case 'baixa': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-licorice/40 bg-antique';
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-antique overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Task Content */}
          {view === 'list' ? (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "group bg-white p-6 rounded-3xl border border-licorice/5 shadow-sm transition-all hover:shadow-md flex items-start gap-6 cursor-pointer",
                        task.status === 'concluida' && "opacity-60"
                      )}
                      onClick={() => handleEditTask(task)}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(task.id);
                        }}
                        className={cn(
                          "mt-1 transition-all",
                          task.status === 'concluida' ? "text-aventurine" : "text-licorice/20 hover:text-aventurine"
                        )}
                      >
                        {task.status === 'concluida' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className={cn(
                            "font-bold text-licorice transition-all",
                            task.status === 'concluida' && "line-through text-licorice/40"
                          )}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "px-3 py-1 rounded-xl text-[10px] font-medium tracking-wide",
                              getPriorityColor(task.priority)
                            )}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              className="p-2 text-licorice/10 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-sm text-licorice/60 leading-relaxed max-w-2xl">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-6 pt-2">
                          {task.dueDate && (
                            <div className="flex items-center gap-2 text-[11px] font-medium text-licorice/40">
                              <Calendar size={14} />
                              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                          {task.leadId && (
                            <div className="flex items-center gap-2 text-[11px] font-medium text-aventurine">
                              <Users size={14} />
                              <span>{leads.find(l => l.id === task.leadId)?.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] font-medium text-licorice/20">
                            <Clock size={14} />
                            <span>Criada em {new Date(task.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-white/50 border border-dashed border-licorice/10 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-antique rounded-2xl flex items-center justify-center text-licorice/20 mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h3 className="font-bold text-licorice">Nenhuma tarefa encontrada</h3>
                      <p className="text-sm text-licorice/40">Tudo limpo por aqui! Aproveite para relaxar ou criar uma nova tarefa.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-6 h-full min-h-[500px] overflow-x-auto pb-4 no-scrollbar">
                {(['pendente', 'em_andamento', 'concluida'] as const)
                  .filter(status => filterStatus === 'todos' || filterStatus === status)
                  .map((status) => (
                  <div key={status} className="flex-1 min-w-[320px] flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-licorice">
                          {status === 'pendente' && 'Pendentes'}
                          {status === 'em_andamento' && 'Em andamento'}
                          {status === 'concluida' && 'Concluídas'}
                        </h3>
                        <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-licorice/40 border border-licorice/5">
                          {tasks.filter(t => t.status === status).length}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setNewTask({ ...newTask, status });
                          setShowNewTaskModal(true);
                        }}
                        className="p-1.5 text-licorice/20 hover:text-aventurine hover:bg-white rounded-lg transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <DroppableAny droppableId={status}>
                      {(provided: any, snapshot: any) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={cn(
                            "flex-1 p-4 rounded-[32px] border-2 border-dashed transition-all min-h-[400px]",
                            snapshot.isDraggingOver ? "bg-aventurine/5 border-aventurine/20" : "bg-antique/50 border-licorice/5"
                          )}
                        >
                          <div className="space-y-4">
                            {tasks
                              .filter(t => t.status === status)
                              .filter(t => {
                                const search = searchQuery.toLowerCase();
                                return (t.title || '').toLowerCase().includes(search) || 
                                       t.description?.toLowerCase().includes(search);
                              })
                              .map((task, index) => (
                                <DraggableAny key={task.id} draggableId={task.id} index={index}>
                                  {(provided: any, snapshot: any) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "bg-white p-5 rounded-2xl border border-licorice/5 shadow-sm transition-all cursor-pointer",
                                        snapshot.isDragging ? "shadow-xl scale-105 rotate-2" : "hover:shadow-md"
                                      )}
                                      onClick={() => handleEditTask(task)}
                                    >
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className={cn(
                                            "text-sm font-bold text-licorice leading-tight",
                                            task.status === 'concluida' && "line-through text-licorice/40"
                                          )}>
                                            {task.title}
                                          </h4>
                                          <span className={cn(
                                             "px-2 py-0.5 rounded-xl text-[9px] font-medium tracking-wide shrink-0",
                                             getPriorityColor(task.priority)
                                           )}>
                                             {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                          </span>
                                        </div>
                                        
                                        {task.description && (
                                          <p className="text-[11px] text-licorice/60 line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-licorice/5">
                                          <div className="flex items-center gap-2">
                                            {task.dueDate && (
                                              <div className="flex items-center gap-1 text-[9px] font-bold text-licorice/40">
                                                <Calendar size={10} />
                                                <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                                              </div>
                                            )}
                                          </div>
                                          {task.leadId && (
                                            <div className="w-6 h-6 bg-antique rounded-lg flex items-center justify-center text-[10px] font-bold text-licorice">
                                              {leads.find(l => l.id === task.leadId)?.name.charAt(0)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </DraggableAny>
                              ))}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </DroppableAny>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowNewTaskModal(false);
                setEditingTask(null);
                setNewTask({ priority: 'media', status: 'pendente' });
                setClientSearchQuery('');
              }}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-visible"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-aventurine/10 rounded-2xl flex items-center justify-center text-aventurine">
                      {editingTask ? <MoreVertical size={24} /> : <Plus size={24} />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-licorice">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                      <p className="text-xs text-licorice/40">{editingTask ? 'Atualize as informações da atividade.' : 'Adicione uma nova atividade à sua lista.'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-licorice/40">Título da Tarefa</label>
                    <input 
                      type="text" 
                      placeholder="O que precisa ser feito?"
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                      value={newTask.title || ''}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-licorice/40">Descrição (Opcional)</label>
                    <textarea 
                      placeholder="Adicione mais detalhes..."
                      rows={3}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50 resize-none"
                      value={newTask.description || ''}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-licorice/40">Prioridade</label>
                      <select 
                        className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-licorice/40">Data de Entrega</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                        value={newTask.dueDate || ''}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-xs font-medium text-licorice/40">Vincular Cliente (Opcional)</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-licorice/20" size={16} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar cliente..."
                        className="w-full pl-11 pr-10 py-3 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                        value={clientSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClientSearchQuery(val);
                          setShowClientResults(true);
                          if (!val) setNewTask({ ...newTask, leadId: undefined });
                        }}
                        onFocus={() => setShowClientResults(true)}
                      />
                      {newTask.leadId && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-aventurine">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {showClientResults && clientSearchQuery && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 left-0 right-0 mt-2 bg-white border border-licorice/5 rounded-2xl shadow-xl max-h-48 overflow-y-auto no-scrollbar"
                        >
                          <div className="p-2">
                            {leads.filter(l => {
                              const query = clientSearchQuery.toLowerCase();
                              const queryDigits = clientSearchQuery.replace(/\D/g, '');
                              return (l.name || '').toLowerCase().includes(query) ||
                                     (queryDigits !== '' && (l.phone || '').replace(/\D/g, '').includes(queryDigits));
                            }).length > 0 ? (
                              leads
                                .filter(l => {
                                  const query = clientSearchQuery.toLowerCase();
                                  const queryDigits = clientSearchQuery.replace(/\D/g, '');
                                  return (l.name || '').toLowerCase().includes(query) ||
                                         (queryDigits !== '' && (l.phone || '').replace(/\D/g, '').includes(queryDigits));
                                })
                                .map(lead => (
                                  <button
                                    key={lead.id}
                                    onClick={() => {
                                      setNewTask({ ...newTask, leadId: lead.id });
                                      setClientSearchQuery(lead.name);
                                      setShowClientResults(false);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-antique/50 rounded-xl text-sm transition-colors flex items-center gap-3"
                                  >
                                    <div className="w-8 h-8 bg-aventurine/10 rounded-lg flex items-center justify-center text-aventurine text-[10px] font-bold">
                                      {lead.name.charAt(0)}
                                    </div>
                                    <span className="font-medium text-licorice">{lead.name}</span>
                                  </button>
                                ))
                            ) : (
                              <div className="px-4 py-3 text-xs text-licorice/40 text-center italic">
                                Nenhum cliente encontrado
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setShowNewTaskModal(false);
                      setEditingTask(null);
                      setNewTask({ priority: 'media', status: 'pendente' });
                      setClientSearchQuery('');
                    }}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold text-licorice/40 hover:bg-antique transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveTask}
                    disabled={!newTask.title}
                    className="flex-1 py-4 bg-aventurine text-white rounded-2xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all disabled:opacity-50"
                  >
                    {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
