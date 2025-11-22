import React, { useEffect, useState } from 'react';
import { SessionData, Student } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { generateSessionSummary } from '../services/geminiService';
import { Download, RefreshCcw, Check, X, Sparkles, FileSpreadsheet, ExternalLink } from 'lucide-react';

interface SummaryReportProps {
  session: SessionData;
  students: Student[];
  onReset: () => void;
  webhookUrl?: string;
}

export const SummaryReport: React.FC<SummaryReportProps> = ({ session, students, onReset, webhookUrl }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [exportStatus, setExportStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Calculate stats
  const stats = students.map(student => {
    const r = session.records[student.id];
    const checksPresent = [r.check1, r.check2, r.check3].filter(s => s === 'present').length;
    // Logic: Absent if missed more than 1 check (so present < 2)
    const finalStatus = checksPresent >= 2 ? 'Present' : 'Absent';
    return {
      name: student.name,
      photoUrl: student.photoUrl,
      checksPresent,
      finalStatus,
      details: r
    };
  });

  const totalPresent = stats.filter(s => s.finalStatus === 'Present').length;
  const totalAbsent = stats.length - totalPresent;
  const attendanceRate = Math.round((totalPresent / stats.length) * 100) || 0;

  useEffect(() => {
    const fetchSummary = async () => {
      const summary = await generateSessionSummary(session, students);
      setAiSummary(summary);
      setIsLoadingAi(false);
    };
    fetchSummary();
  }, [session, students]);

  const handleWebhookExport = async () => {
    if (!webhookUrl) return;
    setExportStatus('sending');

    const payload = {
      sessionId: session.sessionId,
      date: session.date,
      totalStudents: students.length,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      attendanceRate: `${attendanceRate}%`,
      aiSummary: aiSummary || "Pending or Failed",
      studentRecords: stats.map(s => ({
        name: s.name,
        status: s.finalStatus,
        checksPresent: s.checksPresent,
        check1: s.details.check1,
        check2: s.details.check2,
        check3: s.details.check3
      }))
    };

    try {
      // Using text/plain content type helps avoid some CORS preflight issues with Webhooks (like Zapier)
      // while still sending valid JSON that they can parse.
      await fetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain', 
        },
      });
      setExportStatus('success');
    } catch (error) {
      console.error("Export failed", error);
      // Even if fetch fails due to CORS (opaque response), it might have succeeded on the server.
      // But usually, it throws. If we use no-cors, we can't read status.
      // Let's assume error for now if it throws.
      setExportStatus('error');
    }
  };

  // Chart Data
  const pieData = [
    { name: 'Present', value: totalPresent, color: '#22c55e' }, // green-500
    { name: 'Absent', value: totalAbsent, color: '#ef4444' }    // red-500
  ];

  // Sort stats for list view: Absents first
  const sortedStats = [...stats].sort((a, b) => {
    if (a.finalStatus === b.finalStatus) return a.name.localeCompare(b.name);
    return a.finalStatus === 'Absent' ? -1 : 1;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Session Report</h1>
        <p className="text-slate-500 mt-2">{new Date(session.date).toLocaleDateString()} &bull; {new Date(session.date).toLocaleTimeString()}</p>
      </div>

      {/* High Level Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Attendance Rate</div>
          <div className="text-4xl font-bold text-indigo-600">{attendanceRate}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Students Present</div>
          <div className="text-4xl font-bold text-green-600">{totalPresent}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Students Absent</div>
          <div className="text-4xl font-bold text-red-500">{totalAbsent}</div>
          <div className="text-xs text-slate-400 mt-2">(Missed > 1 check)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Charts & AI */}
        <div className="lg:col-span-1 space-y-6">
          {/* AI Summary */}
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-indigo-600 w-5 h-5" />
              <h3 className="font-bold text-indigo-900">AI Session Insight</h3>
            </div>
            {isLoadingAi ? (
              <div className="animate-pulse space-y-2">
                <div className="h-2 bg-indigo-200 rounded w-3/4"></div>
                <div className="h-2 bg-indigo-200 rounded w-full"></div>
                <div className="h-2 bg-indigo-200 rounded w-5/6"></div>
              </div>
            ) : (
              <p className="text-sm text-indigo-800 leading-relaxed">
                {aiSummary}
              </p>
            )}
          </div>

          {/* Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 w-full text-left">Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Present</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Absent</div>
            </div>
          </div>
        </div>

        {/* Right Col: Student List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-700">Detailed Breakdown</h3>
             <span className="text-xs text-slate-500">Sorted by status</span>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium text-center">Checks (3)</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((stat, idx) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <div className="flex items-center gap-3">
                        {stat.photoUrl ? (
                           <img src={stat.photoUrl} alt={stat.name} className="w-8 h-8 rounded-full object-cover bg-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {stat.name.substring(0,2).toUpperCase()}
                          </div>
                        )}
                        {stat.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                         {Array.from({length: stat.checksPresent}).map((_, i) => (
                           <div key={i} className="w-2 h-6 bg-green-400 rounded-sm" title="Present check"></div>
                         ))}
                         {Array.from({length: 3 - stat.checksPresent}).map((_, i) => (
                           <div key={i} className="w-2 h-6 bg-slate-200 rounded-sm" title="Missed check"></div>
                         ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                        ${stat.finalStatus === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                      `}>
                        {stat.finalStatus === 'Present' ? <Check size={12} /> : <X size={12} />}
                        {stat.finalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-6 border-t border-slate-200">
        <button 
          onClick={onReset}
          className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <RefreshCcw size={18} /> Start New Session
        </button>

        {webhookUrl && (
           <button 
             onClick={handleWebhookExport}
             disabled={exportStatus === 'sending' || exportStatus === 'success'}
             className={`
               px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 border
               ${exportStatus === 'success' 
                 ? 'bg-green-100 text-green-800 border-green-200 cursor-default' 
                 : exportStatus === 'error'
                   ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                   : 'bg-white text-green-700 border-green-600 hover:bg-green-50'}
             `}
           >
             {exportStatus === 'idle' && <><FileSpreadsheet size={18} /> Sync to Google Sheets</>}
             {exportStatus === 'sending' && <><RefreshCcw className="animate-spin" size={18} /> Sending...</>}
             {exportStatus === 'success' && <><Check size={18} /> Synced Successfully</>}
             {exportStatus === 'error' && <><X size={18} /> Failed - Retry?</>}
           </button>
        )}
        
        {!webhookUrl && (
          <div className="text-xs text-slate-400 flex items-center gap-1">
            Configure Integrations in Setup to enable Google Sheets sync
          </div>
        )}
      </div>
    </div>
  );
};