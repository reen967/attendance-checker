import React, { useState } from 'react';
import { Student, SessionData, CheckRecord, CheckStatus } from '../types';
import { CheckCircle2, XCircle, Play, Lock, Users, ArrowRight } from 'lucide-react';

interface ActiveSessionProps {
  students: Student[];
  sessionData: SessionData;
  updateSession: (data: SessionData) => void;
  onFinish: () => void;
}

export const ActiveSession: React.FC<ActiveSessionProps> = ({ students, sessionData, updateSession, onFinish }) => {
  // We track which check is currently being performed. 0 = none, 1 = check1, etc.
  const [activeCheckNum, setActiveCheckNum] = useState<number | null>(null);

  const handleToggleStatus = (studentId: string, checkNum: 1 | 2 | 3) => {
    const currentRecord = sessionData.records[studentId];
    const key = `check${checkNum}` as keyof CheckRecord;
    const currentStatus = currentRecord[key];
    
    const newStatus: CheckStatus = currentStatus === 'present' ? 'absent' : 'present';
    
    const newRecords = {
      ...sessionData.records,
      [studentId]: {
        ...currentRecord,
        [key]: newStatus
      }
    };
    
    updateSession({
      ...sessionData,
      records: newRecords
    });
  };

  const markAll = (checkNum: 1 | 2 | 3, status: CheckStatus) => {
    const newRecords = { ...sessionData.records };
    students.forEach(s => {
      newRecords[s.id] = {
        ...newRecords[s.id],
        [`check${checkNum}` as keyof CheckRecord]: status
      };
    });
    updateSession({ ...sessionData, records: newRecords });
  };

  const commitCheck = () => {
    if (activeCheckNum === null) return;
    
    // Ensure anyone left as 'pending' is marked 'absent' or handle as needed. 
    // For this app, we'll default pending to absent if the check is closed.
    const newRecords = { ...sessionData.records };
    students.forEach(s => {
      const key = `check${activeCheckNum}` as keyof CheckRecord;
      if (newRecords[s.id][key] === 'pending') {
        newRecords[s.id][key] = 'absent';
      }
    });

    updateSession({
      ...sessionData,
      records: newRecords,
      completedChecks: Math.max(sessionData.completedChecks, activeCheckNum)
    });
    setActiveCheckNum(null);
  };

  const isCheckLocked = (checkNum: number) => {
    // Locked if it is already completed AND not currently active
    // Or if it's a future check (e.g. check 3 when check 1 isn't done)
    // Simplified: check N is playable if check N-1 is completed.
    if (activeCheckNum === checkNum) return false; // It's open
    if (sessionData.completedChecks >= checkNum) return true; // It's done
    return sessionData.completedChecks !== checkNum - 1; // Can't skip order
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Class Session</h1>
          <p className="text-slate-500">Perform 3 random checks to track attendance.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
            <Users size={16} />
            {students.length} Students
          </div>
          <button
            onClick={onFinish}
            disabled={sessionData.completedChecks < 3}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Finish Session <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Control Panel - The 3 Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((num) => {
          const isCompleted = sessionData.completedChecks >= num;
          const isActive = activeCheckNum === num;
          const isLocked = isCheckLocked(num);

          return (
            <div 
              key={num}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-300
                ${isActive 
                  ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100' 
                  : isCompleted 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-slate-200 bg-white'}
                ${isLocked && !isCompleted ? 'opacity-50 grayscale' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-bold ${isActive ? 'text-indigo-700' : isCompleted ? 'text-green-700' : 'text-slate-700'}`}>
                  Check {num}
                </h3>
                {isCompleted && !isActive && <CheckCircle2 className="text-green-500" size={20} />}
                {isActive && <span className="animate-pulse text-indigo-600 text-xs font-bold uppercase tracking-wider">Active</span>}
                {isLocked && !isCompleted && <Lock className="text-slate-400" size={16} />}
              </div>
              
              <p className="text-xs text-slate-500 mb-4 min-h-[2.5em]">
                {isActive ? "Mark students below currently present." : 
                 isCompleted ? "Check completed." : 
                 "Start this check randomly during class."}
              </p>

              {isActive ? (
                <div className="flex gap-2">
                  <button 
                    onClick={commitCheck}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Finish Check
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveCheckNum(num)}
                  disabled={isLocked}
                  className={`
                    w-full py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2
                    ${isCompleted 
                      ? 'border-green-200 text-green-700 bg-green-100 hover:bg-green-200' 
                      : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 bg-white'}
                  `}
                >
                   {isCompleted ? 'View Results' : <><Play size={14} /> Start Check</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Student List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Student Name</div>
          <div className="col-span-8 grid grid-cols-3 text-center">
            <div>Check 1</div>
            <div>Check 2</div>
            <div>Check 3</div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {activeCheckNum !== null && (
             <div className="sticky top-0 z-10 bg-indigo-50 p-2 mb-2 rounded-lg flex justify-between items-center shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-1">
               <span className="text-sm font-medium text-indigo-800 flex items-center gap-2">
                 <Play size={16} className="fill-indigo-800" /> Check {activeCheckNum} in progress
               </span>
               <div className="flex gap-2">
                 <button onClick={() => markAll(activeCheckNum as 1|2|3, 'present')} className="text-xs bg-white border border-indigo-200 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100 font-medium">
                    Mark All Present
                 </button>
                 <button onClick={() => markAll(activeCheckNum as 1|2|3, 'absent')} className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 font-medium">
                    Mark All Absent
                 </button>
               </div>
             </div>
          )}

          {students.map(student => {
            const record = sessionData.records[student.id];
            return (
              <div key={student.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <div className="col-span-4 font-medium text-slate-700 truncate flex items-center gap-4">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover bg-slate-200 flex-shrink-0 border-2 border-white shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 text-lg font-bold border-2 border-white shadow-sm">
                      {student.name.substring(0,2).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-base">{student.name}</span>
                </div>
                
                <div className="col-span-8 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => {
                    const status = record[`check${num}` as keyof CheckRecord];
                    const isActive = activeCheckNum === num;
                    
                    return (
                      <div key={num} className="flex justify-center items-center">
                        <button
                          onClick={() => isActive && handleToggleStatus(student.id, num as 1|2|3)}
                          disabled={!isActive}
                          className={`
                            w-full max-w-[100px] h-10 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${status === 'present' 
                              ? 'bg-green-100 text-green-700 ring-1 ring-green-200' 
                              : status === 'absent' 
                                ? 'bg-red-100 text-red-700 ring-1 ring-red-200' 
                                : 'bg-slate-100 text-slate-400'}
                            ${isActive ? 'hover:scale-105 cursor-pointer shadow-sm ring-2 ring-offset-1 ring-transparent hover:ring-indigo-200' : 'cursor-default opacity-80'}
                          `}
                        >
                          {status === 'present' && <CheckCircle2 size={20} />}
                          {status === 'absent' && <XCircle size={20} />}
                          {status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-300"></span>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};