import React, { useState } from 'react';
import { Student, SessionData, AppView } from './types';
import { RosterSetup } from './components/RosterSetup';
import { ActiveSession } from './components/ActiveSession';
import { SummaryReport } from './components/SummaryReport';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('roster');
  const [students, setStudents] = useState<Student[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);

  const startSession = () => {
    // Initialize empty records for all students
    const initialRecords: SessionData['records'] = {};
    students.forEach(s => {
      initialRecords[s.id] = {
        check1: 'pending',
        check2: 'pending',
        check3: 'pending'
      };
    });

    setSession({
      sessionId: crypto.randomUUID(),
      date: new Date().toISOString(),
      records: initialRecords,
      completedChecks: 0
    });
    setView('active-session');
  };

  const updateSession = (newSession: SessionData) => {
    setSession(newSession);
  };

  const finishSession = () => {
    setView('summary');
  };

  const resetApp = () => {
    setView('roster');
    setSession(null);
    // We keep students for convenience, they can clear them in RosterSetup if they want
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Simple Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              T
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">TriCheck</span>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {view === 'roster' && 'Setup'}
            {view === 'active-session' && 'Live Session'}
            {view === 'summary' && 'Report'}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {view === 'roster' && (
          <RosterSetup 
            students={students} 
            setStudents={setStudents} 
            onStartSession={startSession} 
          />
        )}

        {view === 'active-session' && session && (
          <ActiveSession 
            students={students}
            sessionData={session}
            updateSession={updateSession}
            onFinish={finishSession}
          />
        )}

        {view === 'summary' && session && (
          <SummaryReport 
            session={session}
            students={students}
            onReset={resetApp}
          />
        )}
      </main>
    </div>
  );
};

export default App;
