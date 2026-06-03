import { useEffect, useMemo, useState } from 'react';
import { getGroups, saveGroup, deleteGroup, getQuests } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import {
  MAX_GROUP_STUDENTS,
  MAX_GROUP_NAME_LENGTH,
  MAX_STUDENT_NAME_LENGTH,
  isStudentNameTaken,
  groupAssignedCount,
} from 'shared';
import type { ClassGroup, GroupStudent, Quest } from 'shared';
import { Users, Plus, Trash2, UserPlus, X, BookMarked, GraduationCap } from 'lucide-react';

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);

const nowIso = () => new Date().toISOString();

export function ClassGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [studentInput, setStudentInput] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [g, q] = await Promise.all([getGroups(user.uid), getQuests(user.uid)]);
      if (!active) return;
      setGroups(g);
      setQuests(q);
      if (g.length > 0) setSelectedId(g[0].id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const selected = useMemo(() => groups.find(g => g.id === selectedId) ?? null, [groups, selectedId]);
  const questTitle = (id: string) => quests.find(q => q.id === id)?.title ?? 'Избришана авантура';

  const persist = (updated: ClassGroup) => {
    const stamped = { ...updated, updatedAt: nowIso() };
    setGroups(prev => prev.map(g => (g.id === stamped.id ? stamped : g)));
    saveGroup(stamped);
  };

  const createGroup = () => {
    if (!user) return;
    const name = newGroupName.trim().slice(0, MAX_GROUP_NAME_LENGTH);
    if (!name) return;
    const group: ClassGroup = {
      id: uid(),
      ownerId: user.uid,
      name,
      students: [],
      assignedQuestIds: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setGroups(prev => [group, ...prev]);
    setSelectedId(group.id);
    setNewGroupName('');
    saveGroup(group);
  };

  const removeGroup = (id: string) => {
    if (!window.confirm('Дали сте сигурни дека сакате да ја избришете оваа група?')) return;
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selectedId === id) setSelectedId(prev => {
      const rest = groups.filter(g => g.id !== id);
      return rest.length ? rest[0].id : '';
    });
    deleteGroup(id);
  };

  const renameGroup = (name: string) => {
    if (!selected) return;
    persist({ ...selected, name: name.slice(0, MAX_GROUP_NAME_LENGTH) });
  };

  const updateDescription = (description: string) => {
    if (!selected) return;
    persist({ ...selected, description: description.slice(0, 300) || undefined });
  };

  const addStudent = () => {
    if (!selected) return;
    const name = studentInput.trim().slice(0, MAX_STUDENT_NAME_LENGTH);
    if (!name) return;
    if (selected.students.length >= MAX_GROUP_STUDENTS) { setStudentInput(''); return; }
    if (isStudentNameTaken(selected, name)) { setStudentInput(''); return; }
    const student: GroupStudent = { id: uid(), name };
    persist({ ...selected, students: [...selected.students, student] });
    setStudentInput('');
  };

  const removeStudent = (sid: string) => {
    if (!selected) return;
    persist({ ...selected, students: selected.students.filter(s => s.id !== sid) });
  };

  const toggleAssignment = (questId: string) => {
    if (!selected) return;
    const assigned = selected.assignedQuestIds ?? [];
    const next = assigned.includes(questId)
      ? assigned.filter(id => id !== questId)
      : [...assigned, questId];
    persist({ ...selected, assignedQuestIds: next });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto max-w-6xl w-full p-4 md:p-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-indigo-400" /> Класови и групи
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Организирајте ученици во групи и доделувајте им авантури.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Groups list */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="Нова група, напр. 6-в"
              value={newGroupName}
              maxLength={MAX_GROUP_NAME_LENGTH}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createGroup(); } }}
            />
            <button
              type="button"
              onClick={createGroup}
              title="Создај група"
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Сè уште немате групи.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {groups.map(g => {
                const active = g.id === selectedId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedId(g.id)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="block font-semibold truncate">{g.name}</span>
                    <span className={`block text-xs ${active ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {g.students.length} ученици · {groupAssignedCount(g)} авантури
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected group detail */}
        {selected ? (
          <div className="space-y-6 min-w-0">
            {/* Group meta */}
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={selected.name}
                  maxLength={MAX_GROUP_NAME_LENGTH}
                  onChange={e => renameGroup(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeGroup(selected.id)}
                  title="Избриши група"
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                rows={2}
                placeholder="Опис (опционално)..."
                value={selected.description ?? ''}
                maxLength={300}
                onChange={e => updateDescription(e.target.value)}
              />
            </div>

            {/* Students */}
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Ученици ({selected.students.length}/{MAX_GROUP_STUDENTS})
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  placeholder="Име на ученик..."
                  value={studentInput}
                  maxLength={MAX_STUDENT_NAME_LENGTH}
                  onChange={e => setStudentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStudent(); } }}
                />
                <button
                  type="button"
                  onClick={addStudent}
                  disabled={selected.students.length >= MAX_GROUP_STUDENTS}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Додај
                </button>
              </div>
              {selected.students.length === 0 ? (
                <p className="text-xs text-slate-500">Сè уште нема ученици во оваа група.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selected.students.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-slate-700/60 text-slate-200 text-sm rounded-full">
                      {s.name}
                      <button
                        type="button"
                        onClick={() => removeStudent(s.id)}
                        title="Отстрани ученик"
                        className="text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned adventures */}
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-amber-400" /> Доделени авантури ({groupAssignedCount(selected)})
              </h3>
              {quests.length === 0 ? (
                <p className="text-xs text-slate-500">Немате создадено авантури за доделување.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {quests.map(q => {
                    const on = (selected.assignedQuestIds ?? []).includes(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => toggleAssignment(q.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          on
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {on ? '✓ ' : '+ '}{q.title}
                      </button>
                    );
                  })}
                </div>
              )}
              {groupAssignedCount(selected) > 0 && (
                <ul className="pt-1 space-y-1">
                  {(selected.assignedQuestIds ?? []).map(id => (
                    <li key={id} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="text-amber-400">•</span>
                      <span className="truncate">{questTitle(id)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center flex flex-col items-center justify-center">
            <GraduationCap className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400">Изберете или создадете група за да започнете.</p>
          </div>
        )}
      </div>
    </div>
  );
}
