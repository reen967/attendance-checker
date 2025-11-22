import React, { useState } from 'react';
import { Student } from '../types';
import { parseRosterFromText } from '../services/geminiService';
import { Users, Wand2, Plus, Trash2, ArrowRight } from 'lucide-react';

interface RosterSetupProps {
  students: Student[];
  setStudents: (students: Student[]) => void;
  onStartSession: () => void;
}

export const RosterSetup: React.FC<RosterSetupProps> = ({ students, setStudents, onStartSession }) => {
  const [inputText, setInputText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  const handleAiImport = async () => {
    if (!inputText.trim()) return;
    setIsImporting(true);
    try {
      const names = await parseRosterFromText(inputText);
      const newStudents: Student[] = names.map(name => ({
        id: crypto.randomUUID(),
        name
      }));
      setStudents([...students, ...newStudents]);
      setInputText('');
    } catch (e) {
      alert("Failed to import names. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    setStudents([...students, { id: crypto.randomUUID(), name: newStudentName.trim() }]);
    setNewStudentName('');
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
            <Users size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Class Roster</h1>
        <p className="text-slate-500">Import your students to begin tracking attendance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Import Section */}
        <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            AI Quick Import
          </h2>
          <p className="text-sm text-slate-500">Paste a list of names (comma separated, new lines, or a paragraph) and let AI extract them.</p>
          <textarea
            className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            placeholder="Paste names here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            onClick={handleAiImport}
            disabled={isImporting || !inputText.trim()}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>Processing...</>
            ) : (
              <>
                <Wand2 size={16} /> Extract Names
              </>
            )}
          </button>
        </div>

        {/* Current Roster */}
        <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Students ({students.length})</h2>
            <button 
              onClick={() => setStudents([])}
              className="text-xs text-red-500 hover:text-red-700"
              disabled={students.length === 0}
            >
              Clear All
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-2">
            {students.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                No students added yet.
              </div>
            ) : (
              students.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                  <span className="font-medium text-slate-700">{student.name}</span>
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleManualAdd} className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Add single name..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newStudentName.trim()}
              className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </form>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onStartSession}
          disabled={students.length === 0}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Start Class Session <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};
