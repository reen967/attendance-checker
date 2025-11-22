import React, { useState, useEffect, useRef } from 'react';
import { Student, ClassProfile } from '../types';
import { parseRosterFromText } from '../services/geminiService';
import { fetchStudentsFromCsv, parseStudentCsv } from '../services/sheetService';
import { Users, Wand2, Plus, Trash2, ArrowRight, Link2, Settings2, FileSpreadsheet, Save, Download, Loader2, Upload, Image as ImageIcon, Database, Globe } from 'lucide-react';

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
  
  // Manual Add State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhoto, setNewStudentPhoto] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Class Management State
  const [savedClasses, setSavedClasses] = useState<ClassProfile[]>(() => {
    const saved = localStorage.getItem('triCheck_savedClasses');
    return saved ? JSON.parse(saved) : [];
  });
  const [newClassName, setNewClassName] = useState('');
  const [newClassUrl, setNewClassUrl] = useState('');
  const [isAddingSheetClass, setIsAddingSheetClass] = useState(false);
  const [isSavingLocalClass, setIsSavingLocalClass] = useState(false);
  const [localClassName, setLocalClassName] = useState('');
  
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedStudents = parseStudentCsv(text);
        setStudents([...students, ...parsedStudents]);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error: any) {
        alert(error.message || "Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    setStudents([
      ...students, 
      { 
        id: crypto.randomUUID(), 
        name: newStudentName.trim(),
        photoUrl: newStudentPhoto.trim() || undefined
      }
    ]);
    setNewStudentName('');
    setNewStudentPhoto('');
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  // --- Saving / Loading Classes ---

  const saveSheetClass = (e: React.FormEvent) => {
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
    setIsAddingSheetClass(false);
  };

  const saveLocalClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localClassName.trim() || students.length === 0) return;

    const newClass: ClassProfile = {
      id: crypto.randomUUID(),
      name: localClassName.trim(),
      students: [...students] // Save copy of current students
    };

    setSavedClasses([...savedClasses, newClass]);
    setLocalClassName('');
    setIsSavingLocalClass(false);
  };

  const loadClass = async (cls: ClassProfile) => {
    setLoadingClassId(cls.id);
    try {
      if (cls.sheetUrl) {
        // It's a Google Sheet Class
        const loadedStudents = await fetchStudentsFromCsv(cls.sheetUrl);
        if (loadedStudents.length > 0) {
          setStudents(loadedStudents);
        } else {
          alert("No students found in that sheet.");
        }
      } else if (cls.students) {
        // It's a Local Saved Class
        setStudents(cls.students);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to fetch class.");
    } finally {
      setLoadingClassId(null);
    }
  };

  const deleteClass = (id: string) => {
    setSavedClasses(savedClasses.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
            <Users size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Class Setup</h1>
        <p className="text-slate-500">Load a saved class or build a new roster.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Class Library */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-semibold flex items-center gap-2">
                 <Database className="w-5 h-5 text-indigo-600" />
                 Class Library
               </h2>
               <button 
                 onClick={() => setIsAddingSheetClass(!isAddingSheetClass)}
                 className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
               >
                 <Plus size={14} /> Link Sheet
               </button>
             </div>

             {/* Form: Add Google Sheet Class */}
             {isAddingSheetClass && (
               <form onSubmit={saveSheetClass} className="mb-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                  <h3 className="text-xs font-bold text-indigo-800 uppercase">Link Google Sheet</h3>
                  <input 
                    type="text" 
                    placeholder="Class Name (e.g. Bio 101)"
                    className="w-full p-2 text-sm border border-indigo-200 rounded"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    required
                  />
                  <div>
                    <input 
                      type="url" 
                      placeholder="Published CSV URL"
                      className="w-full p-2 text-sm border border-indigo-200 rounded"
                      value={newClassUrl}
                      onChange={e => setNewClassUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingSheetClass(false)}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Save Link
                    </button>
                  </div>
               </form>
             )}

             <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px] pr-1">
               {savedClasses.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 text-sm italic">
                   No saved classes. <br/> Link a Google Sheet or save your current roster.
                 </div>
               ) : (
                 savedClasses.map(cls => (
                   <div key={cls.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-transparent hover:border-indigo-200 transition-all group">
                     <div className="flex items-center gap-3 overflow-hidden">
                       {cls.sheetUrl ? (
                         <div className="bg-green-100 p-2 rounded text-green-700 flex-shrink-0" title="Linked Google Sheet">
                           <Globe size={16} />
                         </div>
                       ) : (
                         <div className="bg-blue-100 p-2 rounded text-blue-700 flex-shrink-0" title="Saved List">
                           <Database size={16} />
                         </div>
                       )}
                       <div className="overflow-hidden">
                         <span className="font-medium text-slate-700 block truncate text-sm">{cls.name}</span>
                         <span className="text-[10px] text-slate-400 block">
                           {cls.sheetUrl ? 'Google Sheet' : `${cls.students?.length || 0} Students`}
                         </span>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadClass(cls)}
                          disabled={loadingClassId === cls.id}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 text-xs font-medium rounded shadow-sm transition-all flex items-center gap-2"
                        >
                          {loadingClassId === cls.id ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} />}
                          Load
                        </button>
                        <button 
                          onClick={() => deleteClass(cls.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </div>
        </div>

        {/* Middle Column: Import Tools */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-full">
             <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
               <Upload className="w-5 h-5 text-slate-600" />
               Import Tools
             </h2>
             
             <div className="space-y-6">
                {/* 1. CSV Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Option 1: Upload CSV File</label>
                  <div className="relative">
                    <input 
                       type="file" 
                       accept=".csv"
                       ref={fileInputRef}
                       onChange={handleFileUpload}
                       className="hidden"
                       id="csv-upload"
                    />
                    <label 
                      htmlFor="csv-upload"
                      className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-all"
                    >
                      <FileSpreadsheet className="mr-2" size={18} />
                      Click to upload CSV (Name, Photo)
                    </label>
                  </div>
                </div>

                {/* 2. AI Paste */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Option 2: Paste & Extract (AI)</label>
                  <div className="relative">
                    <textarea
                      className="w-full h-24 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                      placeholder="Paste a list of names or a paragraph..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <button
                      onClick={handleAiImport}
                      disabled={isImporting || !inputText.trim()}
                      className="absolute bottom-2 right-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isImporting ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />} Extract
                    </button>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded text-xs text-slate-500">
                  <strong>Tip:</strong> For photos, ensure your CSV has a column named "Photo" or "Image" with a direct URL.
                </div>
             </div>
           </div>
        </div>

        {/* Right Column: Active Roster */}
        <div className="lg:col-span-4 flex flex-col h-[600px] bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Active Roster ({students.length})</h2>
            <div className="flex gap-2">
              {students.length > 0 && !isSavingLocalClass && (
                <button 
                  onClick={() => setIsSavingLocalClass(true)}
                  className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-colors"
                  title="Save current list to Library"
                >
                  <Save size={14} /> Save List
                </button>
              )}
              <button 
                onClick={() => setStudents([])}
                className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 py-1"
                disabled={students.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Save Local Class Form */}
          {isSavingLocalClass && (
             <form onSubmit={saveLocalClass} className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-blue-800 mb-1">Name this Class Profile</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    className="flex-1 p-1.5 text-sm border border-blue-200 rounded"
                    placeholder="e.g. Period 2"
                    value={localClassName}
                    onChange={e => setLocalClassName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="bg-blue-600 text-white px-3 rounded text-xs font-bold">Save</button>
                  <button type="button" onClick={() => setIsSavingLocalClass(false)} className="text-blue-400 hover:text-blue-600"><Trash2 size={14}/></button>
                </div>
             </form>
          )}
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4 border-t border-b border-slate-100 py-2">
            {students.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm space-y-2 opacity-60">
                <Users size={32} />
                <p>Roster is empty.</p>
              </div>
            ) : (
              students.map(student => (
                <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group hover:shadow-sm transition-all border border-transparent hover:border-indigo-100">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-200 border border-white shadow-sm flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                        {student.name.substring(0,2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-slate-700 text-sm truncate">{student.name}</span>
                  </div>
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Manual Add Form */}
          <form onSubmit={handleManualAdd} className="pt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Manual Add</div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Student Name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                   <ImageIcon className="absolute left-3 top-2.5 text-slate-400" size={14} />
                   <input
                    type="url"
                    value={newStudentPhoto}
                    onChange={(e) => setNewStudentPhoto(e.target.value)}
                    placeholder="Photo URL (optional)"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newStudentName.trim()}
                  className="px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-200 gap-4">
        <div className="w-full md:w-auto">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
          >
            <Settings2 size={16} />
            {showSettings ? 'Hide Export Settings' : 'Configure Export (Zapier)'}
          </button>

          {showSettings && (
            <div className="mt-2 p-4 bg-slate-100 rounded-lg border border-slate-200 text-sm w-full md:w-96 animate-in fade-in">
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