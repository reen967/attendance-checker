import { GoogleGenAI, Type } from "@google/genai";
import { SessionData, Student } from "../types";

// Initialize the GenAI client
// IMPORTANT: API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRosterFromText = async (text: string): Promise<string[]> => {
  if (!text.trim()) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract a list of student names from the following text. Return them as a JSON array of strings.
      
      Text:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error("Failed to parse roster with Gemini:", error);
    // Fallback to simple newline splitting if AI fails
    return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  }
};

export const generateSessionSummary = async (
  session: SessionData,
  students: Student[]
): Promise<string> => {
  // Prepare data for the prompt
  const totalStudents = students.length;
  let totalPresent = 0;
  let chronicallyAbsent = [];

  for (const student of students) {
    const record = session.records[student.id];
    const presentCount = 
      (record.check1 === 'present' ? 1 : 0) +
      (record.check2 === 'present' ? 1 : 0) +
      (record.check3 === 'present' ? 1 : 0);
    
    // Logic: Absent if missed more than 1 check (so present count < 2)
    if (presentCount >= 2) {
      totalPresent++;
    } else {
      chronicallyAbsent.push(student.name);
    }
  }

  const promptData = JSON.stringify({
    date: session.date,
    totalStudents,
    finalAttendanceCount: totalPresent,
    absentStudentNames: chronicallyAbsent,
    details: students.map(s => ({
      name: s.name,
      checks: session.records[s.id]
    }))
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a strict but fair school administrator. Write a brief, 1-paragraph summary of today's class attendance based on the following JSON data. 
      Highlight who was absent and the overall attendance rate. 
      The rule is: a student is considered present only if they attended at least 2 out of the 3 random checks.
      
      Data:
      ${promptData}`,
    });

    return response.text || "Summary could not be generated.";
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return "Unable to generate AI summary at this time.";
  }
};
