import React, { useState, useEffect } from 'react';
import { Student, ClassProfile } from '../types';
import { parseRosterFromText } from '../services/geminiService';
import { fetchStudentsFromCsv } from '../services/sheetService';
import { Users, Wand2, Plus, Trash2, ArrowRight, Link2, Settings2, FileSpreadsheet, Save, Download, Loader2 } from 'lucide-react';

interface RosterSetupProps {
  students: Student[];
  setStudents: (students: Student[]) => void;
  onStartSession: () => void;
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
}

export const RosterSetup: React.FC<RosterSetupProps> = ({ 
  students, 
  setStudents, 
  onStartSession,
  webhookUrl,
  setWebhookUrl
}) => {
  // Main state
  const [inputText, setInputText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Class Management State
  const [savedClasses, setSavedClasses] = useState<ClassProfile[]>(() => {
    const saved = localStorage.getItem('triCheck_savedClasses');
    return saved ? JSON.parse(saved) : [];
  });
  const [newClassName, setNewClassName] = useState('');
  const [newClassUrl, setNewClassUrl] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('triCheck_savedClasses', JSON.stringify(savedClasses));
  }, [savedClasses]);

  // --- Methods ---

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

  const saveNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newClassName.trim() || !newClassUrl.trim()) return;
    
    const newClass: ClassProfile = {
      id: crypto.randomUUID(),
      name: newClassName.trim(),
      sheetUrl: newClassUrl.trim()
    };
    
    setSavedClasses([...savedClasses, newClass]);
    setNewClassName('');
    setNewClassUrl('');
    setIsAddingClass(false);
  };

  const loadClass = async (cls: ClassProfile) => {
    setLoadingClassId(cls.id);
    try {
      const loadedStudents = await fetchStudentsFromCsv(cls.sheetUrl);
      if (loadedStudents.length > 0) {
        // Optional: Confirm before overwriting if list is not empty
        setStudents(loadedStudents);
      } else {
        alert("No students found in that sheet. Check columns 'Name' and optionally 'Photo'.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to fetch class. Ensure the Google Sheet is 'Published to Web' as CSV.");
    } finally {
      setLoadingClassId(null);
    }
  };

  const deleteClass = (id: string) => {
    setSavedClasses(savedClasses.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
            <Users size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Class Setup</h1>
        <p className="text-slate-500">Select a class profile or import students manually.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Import Methods (Google Sheets / AI) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Class Profiles Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-semibold flex items-center gap-2">
                 <FileSpreadsheet className="w-5 h-5 text-green-600" />
                 Saved Classes
               </h2>
               <button 
                 onClick={() => setIsAddingClass(!isAddingClass)}
                 className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
               >
                 <Plus size={14} /> Add New Class
               </button>
             </div>

             {isAddingClass && (
               <form onSubmit={saveNewClass} className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-slate-700">Add Google Sheet Class</h3>
                  <input 
                    type="text" 
                    placeholder="Class Name (e.g. Biology 101)"
                    className="w-full p-2 text-sm border border-slate-300 rounded"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    required
                  />
                  <div>
                    <input 
                      type="url" 
                      placeholder="Google Sheet CSV URL"
                      className="w-full p-2 text-sm border border-slate-300 rounded"
                      value={newClassUrl}
                      onChange={e => setNewClassUrl(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      * Go to <strong>File &gt; Share &gt; Publish to web</strong>, select "Entire Document" (or tab) and <strong>Comma-separated values (.csv)</strong>. Copy that link.
                      Sheet must have a column named <strong>Name</strong> and optionally <strong>Photo</strong>.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingClass(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <Save size={14} /> Save Class
                    </button>
                  </div>
               </form>
             )}

             <div className="space-y-2">
               {savedClasses.length === 0 ? (
                 <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                   No classes saved yet. Add a Google Sheet to get started quickly.
                 </div>
               ) : (
                 savedClasses.map(cls => (
                   <div key={cls.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                     <div className="flex items-center gap-3 overflow-hidden">
                       <div className="bg-green-100 p-2 rounded text-green-700">
                         <FileSpreadsheet size={16} />
                       </div>
                       <span className="font-medium text-slate-700 truncate">{cls.name}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadClass(cls)}
                          disabled={loadingClassId === cls.id}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 text-xs font-medium rounded shadow-sm transition-all flex items-center gap-2"
                        >
                          {loadingClassId === cls.id ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} />}
                          Load
                        </button>
                        <button 
                          onClick={() => deleteClass(cls.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>

          {/* AI Import Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              Quick Paste Import
            </h2>
            <p className="text-sm text-slate-500 mb-3">Paste names or a paragraph and let AI extract the list.</p>
            <textarea
              className="w-full h-24 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              placeholder="Paste names here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={handleAiImport}
              disabled={isImporting || !inputText.trim()}
              className="w-full mt-3 py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <><Loader2 className="animate-spin" size={16} /> Processing...</>
              ) : (
                <><Wand2 size={16} /> Extract Names</>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Current Roster */}
        <div className="lg:col-span-5 flex flex-col h-[600px] bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Current Roster ({students.length})</h2>
            <button 
              onClick={() => setStudents([])}
              className="text-xs text-red-500 hover:text-red-700 hover:underline"
              disabled={students.length === 0}
            >
              Clear All
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {students.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm space-y-2">
                <Users size={32} className="opacity-20" />
                <p>No students loaded.</p>
                <p className="text-xs">Load a class or add names manually.</p>
              </div>
            ) : (
              students.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:shadow-sm transition-all border border-transparent hover:border-indigo-100">
                  <div className="flex items-center gap-4">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover bg-slate-200 border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold">
                        {student.name.substring(0,2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-slate-700 text-sm">{student.name}</span>
                  </div>
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100"
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
              placeholder="Add name manually..."
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

      {/* Bottom Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-200 gap-4">
         {/* Integration Toggle */}
        <div className="w-full md:w-auto">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
          >
            <Settings2 size={16} />
            {showSettings ? 'Hide Export Settings' : 'Configure Export (Zapier)'}
          </button>

          {showSettings && (
            <div className="mt-2 p-4 bg-slate-100 rounded-lg border border-slate-200 text-sm w-full md:w-96">
              <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
                 <Link2 size={16} /> Export Webhook URL
              </div>
              <input 
                type="url" 
                placeholder="https://hooks.zapier.com/hooks/catch/..." 
                className="w-full p-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Sends JSON data when a session finishes.</p>
            </div>
          )}
        </div>

        <button
          onClick={onStartSession}
          disabled={students.length === 0}
          className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Start Class Session <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};