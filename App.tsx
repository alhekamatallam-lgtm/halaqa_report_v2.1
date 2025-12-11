
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StudentReportPage from './pages/StudentReportPage';
import CircleReportPage from './pages/CircleReportPage';
import GeneralReportPage from './pages/GeneralReportPage';
import DashboardPage from './pages/DashboardPage';
import DailyDashboardPage from './pages/DailyDashboardPage';
import NotesPage from './pages/NotesPage';
import EvaluationPage from './pages/EvaluationPage';
import ExcellencePage from './pages/ExcellencePage';
import TeacherAttendancePage from './pages/TeacherAttendancePage';
import TeacherAttendanceReportPage from './pages/TeacherAttendanceReportPage';
import SupervisorAttendancePage from './pages/SupervisorAttendancePage';
import CombinedAttendancePage from './pages/CombinedAttendancePage';
import SupervisorAttendanceReportPage from './pages/SupervisorAttendanceReportPage';
import DailyStudentReportPage from './pages/DailyStudentReportPage';
import DailyCircleReportPage from './pages/DailyCircleReportPage';
import ExamPage from './pages/ExamPage';
import ExamReportPage from './pages/ExamReportPage';
import StudentFollowUpPage from './pages/StudentFollowUpPage';
import StudentAttendanceReportPage from './pages/StudentAttendanceReportPage';
import StudentAbsenceReportPage from './pages/StudentAbsenceReportPage';
import SettingsPage from './pages/SettingsPage';
import TeacherListPage from './pages/TeacherListPage';
import PasswordModal from './components/PasswordModal';
import { Sidebar } from './components/Sidebar';
import Notification from './components/Notification';
import type { RawStudentData, ProcessedStudentData, Achievement, ExamSubmissionData, RawSupervisorData, SupervisorData, RawTeacherAttendanceData, TeacherDailyAttendance, TeacherInfo, RawSupervisorAttendanceData, SupervisorAttendanceReportEntry, SupervisorDailyAttendance, SupervisorInfo, RawExamData, ProcessedExamData, RawRegisteredStudentData, ProcessedRegisteredStudentData, RawSettingData, ProcessedSettingsData, RawTeacherInfo, EvalQuestion, EvalSubmissionPayload, ProcessedEvalResult, RawEvalResult, RawProductorData, ProductorData, CombinedTeacherAttendanceEntry, AuthenticatedUser } from './types';
import { MenuIcon, RefreshIcon } from './components/icons';

// --- API Configuration ---
// الرابط الجديد المطلوب
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyI6ZqtUtSv5SEB6vqvIvSzMx77GXpph6JNYACVVoya-VbgrvzLTcPWW7dtWsaqain6/exec';
const LOGO_URL = 'https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png';

// --- IndexedDB Helpers ---
const DB_NAME = 'QuranAppDB_V3';
const STORE_NAME = 'sheetsStore';
const DB_VERSION = 3;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const getSheetFromDB = async (sheetName: string): Promise<any[]> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(sheetName);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    } catch (e) {
        console.warn(`Error reading ${sheetName} from IndexedDB:`, e);
        return [];
    }
};

const saveSheetToDB = async (sheetName: string, data: any[]): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, sheetName);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn(`Error saving ${sheetName} to IndexedDB:`, e);
    }
};
// -------------------------

// --- Helper Functions ---
const normalizeArabicForMatch = (text: string) => {
    if (!text) return '';
    return text
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[إأآا]/g, 'ا')
        .replace(/[يى]/g, 'ي')
        .replace(/ة/g, 'ه')
        .trim();
};

const generateUniqueKey = (sheetName: string, row: any): string => {
    if (row.id) return row.id;
    if (sheetName === 'report') return `${row["اسم المستخدم"]}-${row["الأسبوع"]}`;
    if (sheetName === 'daily') return `${row["اسم المستخدم"]}-${row["اليوم"]}`;
    if (sheetName === 'attandance') return `${row["teacher_id"]}-${row["تاريخ العملية"]}-${row["وقت العملية"]}`;
    if (sheetName === 'teachers') return `${row["teacher_id"]}`;
    if (sheetName === 'supervisor') return `${row["id"]}`;
    if (sheetName === 'Eval_result') return `${row['المعلم']}-${row['الحلقة']}`; 
    return JSON.stringify(row);
};

const parseAchievement = (value: any): Achievement => {
  const strValue = String(value || '');
  if (!strValue || !strValue.includes('%')) {
    return { achieved: 0, required: 0, formatted: '0 / 0', index: 0 };
  }
  const parts = strValue.split('%');
  const achieved = parseFloat(parts[0]) || 0;
  const required = parseFloat(parts[1]) || 0;
  return {
    achieved,
    required,
    formatted: `${achieved} / ${required}`,
    index: required > 0 ? achieved / required : 0,
  };
};

const parsePercentage = (value: any): number => {
    if (typeof value === 'number') return value > 1 ? value / 100 : value;
    const strValue = String(value || '0').trim();
    if (strValue.endsWith('%')) return (parseFloat(strValue.slice(0, -1)) || 0) / 100;
    const numValue = parseFloat(strValue);
    if (isNaN(numValue)) return 0;
    return numValue > 1 ? numValue / 100 : numValue;
};

const processEvalResultsData = (data: RawEvalResult[], questions: EvalQuestion[]): { processedResults: ProcessedEvalResult[]; headerMap: Map<number, string> } => {
  const headerMap = new Map<number, string>();
  // Calculate max score just for display logic, actual logic depends on dynamic questions
  const maxScore = questions.reduce((sum, q) => sum + q.mark, 0);

  if (data.length > 0) {
    const firstRow = data[0];
    const headers = Object.keys(firstRow);
    const normalize = (text: string): string => String(text || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF\s]/g, '').replace(/[إأآا]/g, 'ا'); 
    questions.forEach(q => {
      const normalizedQue = normalize(q.que);
      const foundHeader = headers.find(h => normalize(h) === normalizedQue);
      if (foundHeader) headerMap.set(q.id, foundHeader.trim()); 
      else headerMap.set(q.id, q.que.trim());
    });
  } else {
    questions.forEach(q => headerMap.set(q.id, q.que.trim()));
  }

  const processedResults = data.map((row, index) => {
    let totalScore = 0;
    const scores = questions.map(q => {
      const header = headerMap.get(q.id);
      if (!header) return { question: q.que, score: 0, maxMark: q.mark };
      const score = Number(row[header as keyof RawEvalResult]) || 0;
      totalScore += score;
      return { question: q.que, score: score, maxMark: q.mark };
    });
    return {
      id: `${row['المعلم']}-${row['الحلقة']}-${index}`,
      teacherName: String(row['المعلم'] || ''),
      circleName: String(row['الحلقة'] || ''),
      totalScore,
      maxScore,
      scores,
    };
  }).sort((a,b) => b.totalScore - a.totalScore);
  return { processedResults, headerMap };
};

const processSupervisorData = (data: RawSupervisorData[]): SupervisorData[] => {
    const supervisorMap = new Map<string, { supervisorName: string; password: string; circles: string[] }>();
    data.forEach(item => {
        const supervisorId = (item['id'] || '').trim();
        const supervisorName = (item['المشرف'] || '').trim();
        const password = (item['كلمة المرور'] || '').trim();
        const circle = (item['الحلقة'] || '').trim();
        if (supervisorId && supervisorName && password) {
            if (!supervisorMap.has(supervisorId)) supervisorMap.set(supervisorId, { supervisorName, password, circles: [] });
            const supervisorEntry = supervisorMap.get(supervisorId)!;
            if (circle && !supervisorEntry.circles.includes(circle)) supervisorEntry.circles.push(circle);
        }
    });
    return Array.from(supervisorMap.entries()).map(([id, data]) => ({ id, supervisorName: data.supervisorName, password: data.password, circles: data.circles }));
};

const processProductorData = (data: RawProductorData[]): ProductorData[] => {
    return data.map(item => ({ role: (item['role'] || '').trim(), name: (item['name'] || '').trim(), password: String(item['pwd'] || '').trim() })).filter(item => item.role && item.name && item.password);
};

const getTimestampFromItem = (item: RawTeacherAttendanceData | RawSupervisorAttendanceData): Date | null => {
    let timestamp: Date | null = null;
    const dateProcessValue = item['تاريخ العملية'];
    const timeProcessValue = item['وقت العملية'];
    const isValidDate = (d: Date) => !isNaN(d.getTime());

    if (!dateProcessValue || typeof dateProcessValue === 'object' || !timeProcessValue || typeof timeProcessValue === 'object') return null;

    if (dateProcessValue && timeProcessValue) {
        try {
            const dateProcessStr = String(dateProcessValue);
            const timeProcessStr = String(timeProcessValue);
            if (dateProcessStr.includes('object') || timeProcessStr.includes('object')) return null;
            let year: number, month: number, day: number;
            const dateMatch = dateProcessStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (dateMatch) { year = Number(dateMatch[1]); month = Number(dateMatch[2]); day = Number(dateMatch[3]); }
            else { const d = new Date(dateProcessStr); if (!isValidDate(d)) return null; year = d.getFullYear(); month = d.getMonth() + 1; day = d.getDate(); }
            if (year < 2023) return null;
            let timeString = timeProcessStr.trim();
            let isPM = false;
            if (timeString.includes('م')) { isPM = true; timeString = timeString.replace(/م/g, '').trim(); }
            else if (timeString.includes('ص')) { timeString = timeString.replace(/ص/g, '').trim(); }
            if (timeString.includes('T')) timeString = timeString.split('T')[1];
            else if (timeString.includes(' ')) timeString = timeString.split(' ').pop() || '';
            timeString = timeString.replace('Z', '').split('.')[0];
            const timeParts = timeString.split(':').map(Number);
            if (timeParts.length < 2 || timeParts.some(p => isNaN(p))) return null;
            let [hour, minute, second = 0] = timeParts;
            if (isPM && hour < 12) hour += 12; else if (!isPM && hour === 12) hour = 0;
            const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            if (isValidDate(utcDate)) timestamp = utcDate;
        } catch (e) { }
    }
    if (!timestamp && item.time) {
        const ts = new Date(item.time);
        if (isValidDate(ts) && ts.getFullYear() >= 2023) timestamp = ts;
    }
    return timestamp;
};

const processTeachersInfoData = (data: RawTeacherInfo[]): TeacherInfo[] => {
    return data.map(item => ({ id: item['teacher_id'], name: normalizeArabicForMatch(item['المعلم'] || ''), circle: (item['الحلقات'] || '').trim() })).filter(item => item.id != null && item.name && item.circle);
};

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeachers: TeacherInfo[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });
    const teacherRecords = new Map<number, { teacherName: string, checkIn: Date | null, checkOut: Date | null, checkInNote: string | null, checkOutNote: string | null }>();
    allTeachers.forEach(t => teacherRecords.set(t.id, { teacherName: t.name, checkIn: null, checkOut: null, checkInNote: null, checkOutNote: null }));

    data.forEach(item => {
        const teacherId = item.teacher_id;
        if (teacherId == null) return;
        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        const itemDateRiyadhStr = timestamp.toLocaleDateString('en-CA', { timeZone });
        const status = (item.status || '').trim();
        const note = (item['ملاحظات'] || '').trim();

        if (itemDateRiyadhStr === todayRiyadhStr && teacherRecords.has(teacherId)) {
            const record = teacherRecords.get(teacherId)!;
            if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
                if (!record.checkIn || timestamp < record.checkIn) { record.checkIn = timestamp; record.checkInNote = note || null; }
            } else if (status === 'انصراف') {
                if (!record.checkOut || timestamp > record.checkOut) { record.checkOut = timestamp; record.checkOutNote = note || null; }
            }
        }
    });
    return Array.from(teacherRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        const combinedNotes = [record.checkInNote, record.checkOutNote].filter(Boolean).join('، ');
        return { teacherName: record.teacherName, checkIn: record.checkIn, checkOut: record.checkOut, status, notes: combinedNotes || undefined };
    });
};

const processSupervisorAttendanceData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });
    const supervisorRecords = new Map<string, { supervisorName: string, checkIn: Date | null, checkOut: Date | null }>();
    allSupervisors.forEach(s => supervisorRecords.set(s.id, { supervisorName: s.supervisorName, checkIn: null, checkOut: null }));

    data.forEach(item => {
        const supervisorId = item.id;
        if (!supervisorId) return;
        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        const itemDateRiyadhStr = timestamp.toLocaleDateString('en-CA', { timeZone });
        const status = (item.status || '').trim();
        if (itemDateRiyadhStr === todayRiyadhStr && supervisorRecords.has(supervisorId)) {
            const record = supervisorRecords.get(supervisorId)!;
            if (status === 'حضور' || status === 'الحض' || status === 'الحضور') { if (!record.checkIn || timestamp < record.checkIn) record.checkIn = timestamp; }
            else if (status === 'انصراف') { if (!record.checkOut || timestamp > record.checkOut) record.checkOut = timestamp; }
        }
    });
    return Array.from(supervisorRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        return { supervisorName: record.supervisorName, checkIn: record.checkIn, checkOut: record.checkOut, status };
    });
};

const processTeacherAttendanceReportData = (data: RawTeacherAttendanceData[], teachersInfo: TeacherInfo[]): CombinedTeacherAttendanceEntry[] => {
    const teacherIdToNameMap = new Map<number, string>();
    teachersInfo.forEach(t => teacherIdToNameMap.set(t.id, t.name));
    
    const getDateString = (item: any): string | null => {
        const dateVal = item['تاريخ العملية'];
        if (dateVal && typeof dateVal === 'string') {
            if (dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) return dateVal;
            if (dateVal.match(/^\d{4}-\d{2}-\d{2}T/)) return dateVal.split('T')[0];
        }
        const ts = getTimestampFromItem(item);
        if (ts) { const year = ts.getFullYear(); const month = String(ts.getMonth() + 1).padStart(2, '0'); const day = String(ts.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
        return null;
    };
    const dailyRecords = new Map<string, { teacherId: number; date: string; checkIns: Date[]; checkOuts: Date[]; notes: Set<string>; }>();
    data.forEach(item => {
        const teacherId = item.teacher_id;
        if (teacherId == null) return;
        const dateString = getDateString(item);
        if (!dateString) return;
        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        const mapKey = `${teacherId}/${dateString}`;
        if (!dailyRecords.has(mapKey)) dailyRecords.set(mapKey, { teacherId, date: dateString, checkIns: [], checkOuts: [], notes: new Set() });
        const record = dailyRecords.get(mapKey)!;
        const note = (item['ملاحظات'] || '').trim();
        if (note) record.notes.add(note);
        const status = (item.status || '').trim();
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') record.checkIns.push(timestamp);
        else if (status === 'انصراف') record.checkOuts.push(timestamp);
    });
    
    let limitedRecords = Array.from(dailyRecords.values());
    limitedRecords.sort((a, b) => b.date.localeCompare(a.date));
    
    return limitedRecords.map(record => {
        record.checkIns.sort((a, b) => a.getTime() - b.getTime());
        record.checkOuts.sort((a, b) => a.getTime() - b.getTime());
        const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' };
        const formatTime = (date: Date | undefined) => date ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(date) : null;
        return {
            id: `${record.teacherId}/${record.date}`,
            teacherId: record.teacherId,
            teacherName: teacherIdToNameMap.get(record.teacherId) || `المعلم #${record.teacherId}`,
            date: record.date,
            checkInTime: formatTime(record.checkIns[0]),
            checkOutTime: formatTime(record.checkOuts[record.checkOuts.length - 1]),
            notes: Array.from(record.notes).join('، '),
        };
    });
};

const processSupervisorAttendanceReportData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorAttendanceReportEntry[] => {
    const timeZone = 'Asia/Riyadh';
    const supervisorIdToNameMap = new Map<string, string>();
    allSupervisors.forEach(s => supervisorIdToNameMap.set(s.id, s.supervisorName));
    const toRiyadhDateString = (date: Date): string => {
        const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
        return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    };
    const dailyRecords = new Map<string, { supervisorId: string; date: string; checkIn: { time: string, timestamp: Date } | null; checkOut: { time: string, timestamp: Date } | null }>();
    data.forEach(item => {
        const supervisorId = item.id;
        if (!supervisorId) return;
        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        const timeForDisplay = timestamp.toLocaleTimeString('ar-EG-u-nu-latn', { timeZone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = toRiyadhDateString(timestamp);
        const mapKey = `${supervisorId}/${dateString}`;
        let entry = dailyRecords.get(mapKey);
        if (!entry) { entry = { supervisorId, date: dateString, checkIn: null, checkOut: null }; dailyRecords.set(mapKey, entry); }
        const status = (item.status || '').trim();
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') { if (!entry.checkIn || timestamp < entry.checkIn.timestamp) entry.checkIn = { time: timeForDisplay, timestamp }; }
        else if (status === 'انصراف') { if (!entry.checkOut || timestamp > entry.checkOut.timestamp) entry.checkOut = { time: timeForDisplay, timestamp }; }
    });
    return Array.from(dailyRecords.values()).map(record => ({
        supervisorName: supervisorIdToNameMap.get(record.supervisorId) || `مشرف #${record.supervisorId}`,
        date: record.date,
        checkInTime: record.checkIn ? record.checkIn.time : null,
        checkOutTime: record.checkOut ? record.checkOut.time : null,
    })).sort((a, b) => a.date > b.date ? -1 : 1);
};

const processData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const studentWeekMap = new Map<string, ProcessedStudentData>();
    let lastKey: string | null = null;
    const normalize = (val: any): string => String(val || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');

    for (const item of data) {
        const username = item["اسم المستخدم"];
        const studentName = normalize(item["الطالب"]);
        const week = normalize(item["الأسبوع"] || item["الاسبوع"]);
        let currentKey: string | null = null;
        if (username != null && studentName && week) { currentKey = `${username}-${week}`; lastKey = currentKey; } else { currentKey = lastKey; }
        if (!currentKey) continue;

        const memPages = parseAchievement(item["أوجه الحفظ"]);
        const revPages = parseAchievement(item["أوجه المراجه"]);
        const conPages = parseAchievement(item["أوجه التثبيت"]);
        const points = Number(item["اجمالي النقاط"]) || 0;
        const attendance = parsePercentage(item["نسبة الحضور"]);
        const memLessons = normalize(item["دروس الحفظ"]);
        const revLessons = normalize(item["دروس المراجعة"]);

        if (studentWeekMap.has(currentKey)) {
            const existingStudent = studentWeekMap.get(currentKey)!;
            existingStudent.memorizationPages.achieved += memPages.achieved; existingStudent.memorizationPages.required += memPages.required;
            existingStudent.reviewPages.achieved += revPages.achieved; existingStudent.reviewPages.required += revPages.required;
            existingStudent.consolidationPages.achieved += conPages.achieved; existingStudent.consolidationPages.required += conPages.required;
            existingStudent.totalPoints += points;
            if (memLessons) existingStudent.memorizationLessons = existingStudent.memorizationLessons ? `${existingStudent.memorizationLessons}, ${memLessons}` : memLessons;
            if (revLessons) existingStudent.reviewLessons = existingStudent.reviewLessons ? `${existingStudent.reviewLessons}, ${revLessons}` : revLessons;
        } else {
            if (!studentName || username == null || !week) continue;
            const circle = normalize(item["الحلقة"]);
            const isTabyan = circle.includes('التبيان');
            const finalMemPages = isTabyan ? { achieved: 0, required: memPages.required, formatted: '', index: 0 } : memPages;
            const finalRevPages = isTabyan ? { achieved: 0, required: revPages.required, formatted: '', index: 0 } : revPages;
            const finalConPages = isTabyan ? { achieved: 0, required: conPages.required, formatted: '', index: 0 } : conPages;
            const newStudent: ProcessedStudentData = {
                id: currentKey, studentName, username, circle, circleTime: normalize(item["وقت الحلقة"]),
                memorizationLessons: memLessons, memorizationPages: finalMemPages, reviewLessons: revLessons, reviewPages: finalRevPages, consolidationPages: finalConPages,
                teacherName: normalize(item["اسم المعلم"]), program: normalize(item["البرنامج"]), attendance: attendance, totalPoints: points,
                guardianMobile: normalize(item["جوال ولي الأمر"]), week: week,
            };
            studentWeekMap.set(currentKey, newStudent);
        }
    }
    studentWeekMap.forEach(student => {
        student.memorizationPages.formatted = `${student.memorizationPages.achieved.toFixed(1)} / ${student.memorizationPages.required.toFixed(1)}`;
        student.memorizationPages.index = student.memorizationPages.required > 0 ? student.memorizationPages.achieved / student.memorizationPages.required : 0;
        student.reviewPages.formatted = `${student.reviewPages.achieved.toFixed(1)} / ${student.reviewPages.required.toFixed(1)}`;
        student.reviewPages.index = student.reviewPages.required > 0 ? student.reviewPages.achieved / student.reviewPages.required : 0;
        student.consolidationPages.formatted = `${student.consolidationPages.achieved.toFixed(1)} / ${student.consolidationPages.required.toFixed(1)}`;
        student.consolidationPages.index = student.consolidationPages.required > 0 ? student.consolidationPages.achieved / student.consolidationPages.required : 0;
    });
    return Array.from(studentWeekMap.values());
};

const processDailyData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const normalize = (val: any): string => String(val || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');
    return data.map((item, index): ProcessedStudentData | null => {
        const studentName = normalize(item["الطالب"]); const usernameRaw = item["اسم المستخدم"];
        if (!studentName || usernameRaw == null) return null;
        const username = Number(usernameRaw); const circle = normalize(item["الحلقة"]); const isTabyan = circle.includes('التبيان');
        const memPages = parseAchievement(item["أوجه الحفظ"]); const revPages = parseAchievement(item["أوجه المراجه"]); const conPages = parseAchievement(item["أوجه التثبيت"]);
        const finalMemPages = isTabyan ? { achieved: 0, required: memPages.required, formatted: '', index: 0 } : memPages;
        const finalRevPages = isTabyan ? { achieved: 0, required: revPages.required, formatted: '', index: 0 } : revPages;
        const finalConPages = isTabyan ? { achieved: 0, required: conPages.required, formatted: '', index: 0 } : conPages;
        finalMemPages.formatted = `${finalMemPages.achieved.toFixed(1)} / ${finalMemPages.required.toFixed(1)}`;
        finalMemPages.index = finalMemPages.required > 0 ? finalMemPages.achieved / finalMemPages.required : 0;
        finalRevPages.formatted = `${finalRevPages.achieved.toFixed(1)} / ${finalRevPages.required.toFixed(1)}`;
        finalRevPages.index = finalRevPages.required > 0 ? finalRevPages.achieved / finalRevPages.required : 0;
        finalConPages.formatted = `${finalConPages.achieved.toFixed(1)} / ${finalConPages.required.toFixed(1)}`;
        finalConPages.index = finalConPages.required > 0 ? finalConPages.achieved / finalConPages.required : 0;
        return {
            id: `${username}-${normalize(item["اليوم"])}-${index}`, studentName, username, circle, circleTime: normalize(item["وقت الحلقة"]),
            memorizationLessons: normalize(item["دروس الحفظ"]), memorizationPages: finalMemPages, reviewLessons: normalize(item["دروس المراجعة"]), reviewPages: finalRevPages, consolidationPages: finalConPages,
            teacherName: normalize(item["اسم المعلم"]), program: normalize(item["البرنامج"]), attendance: parsePercentage(item["نسبة الحضور"]), totalPoints: Number(item["اجمالي النقاط"]) || 0,
            guardianMobile: normalize(item["جوال ولي الأمر"]), day: normalize(item["اليوم"]),
        };
    }).filter((item): item is ProcessedStudentData => item !== null);
};

const processExamData = (data: RawExamData[]): ProcessedExamData[] => {
    const normalize = (val: any): string => String(val || '').trim();
    const parseNum = (val: any): number => Number(val) || 0;
    return data.map(item => {
        const studentName = normalize(item["الطالب"]); if (!studentName) return null;
        return { studentName, circle: normalize(item["الحلقة"]), examName: normalize(item["الاختبار  "]), q1: parseNum(item["السؤال الاول"]), q2: parseNum(item["السؤال الثاني"]), q3: parseNum(item["السؤال الثالث"]), q4: parseNum(item["السؤال الرابع"]), q5: parseNum(item["السؤال الخامس"]), totalScore: parseNum(item["إجمالي الدرجة"]) };
    }).filter((item): item is ProcessedExamData => item !== null);
};

const processRegisteredStudentData = (data: RawRegisteredStudentData[]): ProcessedRegisteredStudentData[] => {
    const normalize = (val: any): string => String(val || '').trim();
    return data.map(item => { const studentName = normalize(item["الطالب"]); const circle = normalize(item["الحلقة"]); if (!studentName || !circle) return null; return { studentName, circle }; }).filter((item): item is ProcessedRegisteredStudentData => item !== null);
};

const extractTimeFromSheetDate = (value: string | undefined): string => {
    if (!value || typeof value !== 'string') return '';
    const timeMatch = value.match(/\d{2}:\d{2}/);
    return timeMatch ? timeMatch[0] : '';
};

const processSettingsData = (data: RawSettingData[]): ProcessedSettingsData => {
    if (!data || !Array.isArray(data) || data.length === 0) return {};
    const firstRow = data[0];
    if (!firstRow) return {};
    return {
        default_student_count_day: firstRow["اليوم الافتراضي"] || '',
        teacher_late_checkin_time: extractTimeFromSheetDate(firstRow["وقت تأخر حضور المعلمين"]),
        teacher_early_checkout_time: extractTimeFromSheetDate(firstRow["وقت انصراف مبكر للمعلمين"]),
        supervisor_late_checkin_time: extractTimeFromSheetDate(firstRow["وقت تأخر حضور المشرفين"]),
        supervisor_early_checkout_time: extractTimeFromSheetDate(firstRow["وقت انصراف مبكر للمشرفين"]),
    };
};

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'combinedAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendanceReport' | 'exam' | 'examReport' | 'studentFollowUp' | 'studentAttendanceReport' | 'studentAbsenceReport' | 'settings' | 'teacherList';

// --- DATA DEPENDENCY MAP ---
const PAGE_SHEETS_MAP: Record<Page, string[]> = {
    general: ["report", "daily", "setting", "productor", "supervisor", "teachers"], 
    students: ["report"],
    circles: ["report"],
    dashboard: ["report"],
    excellence: ["report"],
    notes: ["report"],
    studentFollowUp: ["report"],
    teacherList: ["report"],
    dailyStudents: ["daily"],
    dailyCircles: ["daily"],
    dailyDashboard: ["daily"],
    studentAttendanceReport: ["daily"],
    studentAbsenceReport: ["daily"],
    evaluation: ["eval", "Eval_result", "daily"],
    combinedAttendance: ["teachers", "attandance", "supervisor", "respon"],
    teacherAttendanceReport: ["teachers", "attandance"],
    supervisorAttendanceReport: ["supervisor", "respon"],
    exam: ["regstudent", "exam"],
    examReport: ["regstudent", "exam"],
    settings: ["daily", "setting"],
};

// Core data to ensure basic app structure works
const CORE_SHEETS = ['setting', 'productor', 'supervisor', 'teachers'];

const App: React.FC = () => {
    // State Variables
    const [students, setStudents] = useState<ProcessedStudentData[]>([]);
    const [dailyStudents, setDailyStudents] = useState<ProcessedStudentData[]>([]);
    const [evalQuestions, setEvalQuestions] = useState<EvalQuestion[]>([]);
    const [evalResults, setEvalResults] = useState<ProcessedEvalResult[]>([]);
    const [evalHeaderMap, setEvalHeaderMap] = useState<Map<number, string>>(new Map());
    const [examData, setExamData] = useState<ProcessedExamData[]>([]);
    const [registeredStudents, setRegisteredStudents] = useState<ProcessedRegisteredStudentData[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [productors, setProductors] = useState<ProductorData[]>([]);
    const [teachersInfo, setTeachersInfo] = useState<TeacherInfo[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<TeacherDailyAttendance[]>([]);
    const [combinedTeacherAttendanceLog, setCombinedTeacherAttendanceLog] = useState<CombinedTeacherAttendanceEntry[]>([]);
    const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorDailyAttendance[]>([]);
    const [supervisorAttendanceReport, setSupervisorAttendanceReport] = useState<SupervisorAttendanceReportEntry[]>([]);
    const [settings, setSettings] = useState<ProcessedSettingsData>({});
    
    // UI States
    const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingTeacher, setSubmittingTeacher] = useState<string | null>(null);
    const [submittingSupervisor, setSubmittingSupervisor] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('general');
    const [initialStudentFilter, setInitialStudentFilter] = useState<{ circle: string } | null>(null);
    const [initialDailyStudentFilter, setInitialDailyStudentFilter] = useState<{ circle: string } | null>(null);
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Track loaded sheets to avoid re-fetching unnecessarily in session
    const [loadedSheets, setLoadedSheets] = useState<Set<string>>(new Set());

    const asrTeachersInfo = useMemo(() => {
        return [...teachersInfo].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [teachersInfo]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // --- Core Sync Logic (Network Only) ---
    // Modified to return boolean indicating if changes were found
    const syncSheet = async (sheetName: string): Promise<{ data: any[], hasChanges: boolean }> => {
        const LASTSYNC_KEY = "lastSync_" + sheetName;
        const lastSync = localStorage.getItem(LASTSYNC_KEY);

        let url = `${API_BASE_URL}?sheet=${sheetName}`;
        if (lastSync) {
            url += `&lastSync=${encodeURIComponent(lastSync)}`;
        }

        try {
            const res = await fetch(url);
            const json = await res.json();

            let data = await getSheetFromDB(sheetName) || [];
            let hasChanges = false;

            if (json.data !== null && Array.isArray(json.data)) {
                // Full load (rarely happens with incremental, but possible if reset)
                data = json.data;
                hasChanges = true;
            }

            if (json.changed?.length > 0) {
                hasChanges = true;
                json.changed.forEach((row: any) => {
                    const rowId = row.id || generateUniqueKey(sheetName, row);
                    const index = data.findIndex((item: any) => (item.id || generateUniqueKey(sheetName, item)) === rowId);
                    
                    if (index !== -1) {
                        data[index] = row;
                    } else {
                        data.push(row);
                    }
                });
            }

            if (hasChanges) {
                await saveSheetToDB(sheetName, data);
                localStorage.setItem(LASTSYNC_KEY, new Date().toISOString());
            }

            return { data, hasChanges };
        } catch (e) {
            console.error(`Error syncing ${sheetName}`, e);
            // On error, return cached data and no changes
            const cachedData = await getSheetFromDB(sheetName) || [];
            return { data: cachedData, hasChanges: false };
        }
    };

    // Modified to aggregate change status from all sheets
    const syncSheetsForPage = async (pageName: Page): Promise<{ data: Record<string, any[]>, hasChanges: boolean }> => {
        const sheets = PAGE_SHEETS_MAP[pageName] || [];
        const result: Record<string, any[]> = {};
        let anyChanges = false;

        for (const sheet of sheets) {
            const { data, hasChanges } = await syncSheet(sheet);
            result[sheet] = data;
            if (hasChanges) anyChanges = true;
        }
        return { data: result, hasChanges: anyChanges };
    };

    // --- Load Local Logic (Cache First) ---
    const loadLocalDataForPage = async (pageName: Page) => {
        const sheets = PAGE_SHEETS_MAP[pageName] || [];
        const result: Record<string, any[]> = {};
        for (const sheet of sheets) {
            result[sheet] = await getSheetFromDB(sheet);
        }
        return result;
    };

    // --- State Update Logic ---
    const processPartialData = (dataContainer: any) => {
        // --- Core ---
        if (dataContainer.setting) {
             const clean = dataContainer.setting.map((row: any) => cleanKeys(row));
             setSettings(processSettingsData(clean));
        }
        if (dataContainer.productor) {
            setProductors(processProductorData(dataContainer.productor));
        }
        if (dataContainer.supervisor) {
            const cleanSup = processSupervisorData(dataContainer.supervisor);
            setSupervisors(cleanSup);
        }
        if (dataContainer.teachers) {
            const cleanTeachers = processTeachersInfoData(dataContainer.teachers);
            setTeachersInfo(cleanTeachers);
        }

        // --- Reports ---
        if (dataContainer.report) {
            const clean = dataContainer.report.map((row: any) => cleanKeys(row));
            setStudents(processData(clean));
        }
        if (dataContainer.daily) {
            const clean = dataContainer.daily.map((row: any) => cleanKeys(row));
            setDailyStudents(processDailyData(clean));
        }

        // --- Attendance ---
        if (dataContainer.attandance) {
            let currentTeachers = teachersInfo;
            if (dataContainer.teachers) {
                currentTeachers = processTeachersInfoData(dataContainer.teachers);
            }
            setTeacherAttendance(processTeacherAttendanceData(dataContainer.attandance, currentTeachers));
            setCombinedTeacherAttendanceLog(processTeacherAttendanceReportData(dataContainer.attandance, currentTeachers));
        }

        if (dataContainer.respon) {
            let currentSupervisors = supervisors;
            if (dataContainer.supervisor) {
                currentSupervisors = processSupervisorData(dataContainer.supervisor);
            }
            setSupervisorAttendance(processSupervisorAttendanceData(dataContainer.respon, currentSupervisors));
            setSupervisorAttendanceReport(processSupervisorAttendanceReportData(dataContainer.respon, currentSupervisors));
        }

        // --- Evaluation ---
        if (dataContainer.eval) {
            setEvalQuestions(dataContainer.eval);
        }
        if (dataContainer.Eval_result) {
             let currentQuestions = evalQuestions;
             if (dataContainer.eval) currentQuestions = dataContainer.eval;
             
             if (currentQuestions.length > 0) {
                 const { processedResults, headerMap } = processEvalResultsData(dataContainer.Eval_result, currentQuestions);
                 setEvalResults(processedResults);
                 setEvalHeaderMap(headerMap);
             }
        }

        // --- Exams ---
        if (dataContainer.regstudent) {
            setRegisteredStudents(processRegisteredStudentData(dataContainer.regstudent));
        }
        if (dataContainer.exam) {
            setExamData(processExamData(dataContainer.exam));
        }
    };

    const cleanKeys = (row: any) => {
        const newRow: { [key: string]: any } = {};
        Object.keys(row).forEach(key => {
            const cleanedKey = key.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            newRow[cleanedKey] = row[key];
        });
        return newRow;
    };

    // 1. Initial Mount: Load CORE Local Data immediately
    useEffect(() => {
        const initApp = async () => {
            // Load core data from cache
            const coreData: any = {};
            for (const sheet of CORE_SHEETS) {
                coreData[sheet] = await getSheetFromDB(sheet);
            }
            processPartialData(coreData);
        };
        initApp();
    }, []);

    // 2. Page Change: Load Local Data for that page (Offline First) -> THEN Sync
    useEffect(() => {
        if (currentPage) {
            const loadAndSync = async () => {
                // Step 1: Load from IndexedDB immediately
                const localData = await loadLocalDataForPage(currentPage);
                processPartialData(localData);

                // Step 2: Trigger Background Sync
                setIsBackgroundUpdating(true);
                try {
                    const { data: syncedData, hasChanges } = await syncSheetsForPage(currentPage);
                    processPartialData(syncedData);
                    
                    // Trigger notification based on sync result
                    if (hasChanges) {
                        setNotification({ message: 'تمت المزامنة – توجد بيانات جديدة', type: 'success' });
                    } else {
                        setNotification({ message: 'تمت المزامنة – لا توجد بيانات جديدة', type: 'info' });
                    }
                } catch (e) {
                    console.error("Background sync failed", e);
                    // Optionally show error notification, though prompt asked for quiet failures or specific success msgs
                } finally {
                    setIsBackgroundUpdating(false);
                }
            };
            loadAndSync();
        }
    }, [currentPage]);

    // 3. Manual Refresh Handler
    const handleManualRefresh = async () => {
        setIsBackgroundUpdating(true);
        try {
            const { data: syncedData, hasChanges } = await syncSheetsForPage(currentPage);
            processPartialData(syncedData);
            
            if (hasChanges) {
                setNotification({ message: 'تم تحديث البيانات بنجاح', type: 'success' });
            } else {
                setNotification({ message: 'لا توجد تحديثات جديدة', type: 'info' });
            }
        } catch (err) {
            setNotification({ message: 'فشل تحديث البيانات', type: 'error' });
        } finally {
            setIsBackgroundUpdating(false);
        }
    };

    // --- Action Handlers ---

    const postDataToSheet = async (sheetName: string, payload: any) => {
        const url = `${API_BASE_URL}?sheet=${sheetName}`;
        const response = await fetch(url, { 
            method: 'POST', 
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Network error');
        return await response.json();
    };

    const handlePostEvaluation = async (data: EvalSubmissionPayload) => {
        setIsSubmitting(true);
        setNotification(null);
        try {
            const { sheet, ...rowData } = data; 
            await postDataToSheet('Eval_result', rowData);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Trigger sync for evaluation page sheets
            const { data: syncedData } = await syncSheetsForPage('evaluation');
            processPartialData(syncedData);
            
            setNotification({ message: 'تم إرسال التقييم بنجاح!', type: 'success' });
        } catch (err) {
            console.error(err);
            setNotification({ message: 'فشل الإرسال.', type: 'error' });
        } finally { setIsSubmitting(false); }
    };

    const handlePostExam = async (data: ExamSubmissionData) => {
        setIsSubmitting(true);
        try {
            await postDataToSheet('exam', data);
            setNotification({ message: `تم رصد الدرجة بنجاح!`, type: 'success' });
            const { data: syncedData } = await syncSheetsForPage('exam');
            processPartialData(syncedData);
        } catch (err) {
             setNotification({ message: 'فشل الإرسال.', type: 'error' });
        } finally { setIsSubmitting(false); }
    };
    
    const handlePostTeacherAttendance = async (teacherId: number, teacherName: string, action: 'حضور' | 'انصراف') => {
        setSubmittingTeacher(teacherName);
        setIsSubmitting(true);
        const now = new Date();
        const payload = { "teacher_id": teacherId, "name": teacherName, "status": action, "time": now.toISOString() };
        
        try {
            await postDataToSheet('attandance', payload);
            setNotification({ message: `تم تسجيل ${action} للمعلم ${teacherName}`, type: 'success' });
            // Sync needed sheets
            const { data: syncedData } = await syncSheetsForPage('teacherAttendanceReport'); 
            processPartialData(syncedData);
        } catch (err) {
            setNotification({ message: 'فشل التسجيل.', type: 'error' });
        } finally { setIsSubmitting(false); setSubmittingTeacher(null); }
    };

    const handlePostSupervisorAttendance = async (supervisorId: string, action: 'حضور' | 'انصراف') => {
        const supervisor = supervisors.find(s => s.id === supervisorId);
        if(!supervisor) return;
        setSubmittingSupervisor(supervisor.supervisorName);
        setIsSubmitting(true);
        const now = new Date();
        const payload = { "id": supervisorId, "name": supervisor.supervisorName, "status": action, "time": now.toISOString() };
        
        try {
            await postDataToSheet('respon', payload);
            setNotification({ message: `تم تسجيل ${action} للمشرف`, type: 'success' });
            const { data: syncedData } = await syncSheetsForPage('supervisorAttendanceReport');
            processPartialData(syncedData);
        } catch (err) {
            setNotification({ message: 'فشل التسجيل.', type: 'error' });
        } finally { setIsSubmitting(false); setSubmittingSupervisor(null); }
    };

    const handlePostSettings = async (data: ProcessedSettingsData) => {
        setIsSubmitting(true);
        try {
            const payload = { "الرقم": 1, "اليوم الافتراضي": data.default_student_count_day, /*...*/ };
            await postDataToSheet('setting', payload);
            setNotification({ message: 'تم حفظ الإعدادات!', type: 'success' });
            const { data: syncedData } = await syncSheetsForPage('settings');
            processPartialData(syncedData);
        } catch (err) {
            setNotification({ message: 'فشل الحفظ.', type: 'error' });
        } finally { setIsSubmitting(false); }
    };

    const handleRefreshTeacherData = async () => {
        const { data: syncedData } = await syncSheetsForPage('teacherAttendanceReport');
        processPartialData(syncedData);
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        setInitialDailyStudentFilter(null);
        if (!authenticatedUser) {
            if (['evaluation', 'exam', 'settings'].includes(page)) { setCurrentPage(page); setShowPasswordModal(true); setIsMobileSidebarOpen(false); return; }
        } else {
            if (page === 'settings' && authenticatedUser.role !== 'admin') { setNotification({ message: 'ليس لديك صلاحية.', type: 'error' }); setIsMobileSidebarOpen(false); return; }
            if (page === 'exam' && !['admin', 'exam_teacher'].includes(authenticatedUser.role)) { setNotification({ message: 'صلاحية مرفوضة.', type: 'error' }); setIsMobileSidebarOpen(false); return; }
        }
        setCurrentPage(page);
        setShowPasswordModal(false);
        setIsMobileSidebarOpen(false);
    };

    const handleCircleSelect = (circleName: string) => { setInitialStudentFilter({ circle: circleName }); setCurrentPage('students'); };
    const handleDailyCircleSelect = (circleName: string) => { setInitialDailyStudentFilter({ circle: circleName }); setCurrentPage('dailyStudents'); };
    
    // --- Render ---
    const titles: Record<Page, string> = {
        students: 'تقرير الطلاب', circles: 'تقرير الحلقات', general: 'التقرير العام', dashboard: 'متابعة الحلقات', dailyDashboard: 'متابعة الحلقات (يومي)',
        notes: 'ملاحظات الطلاب', evaluation: `زيارات الحلقات ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`, excellence: 'تميز الحلقات',
        combinedAttendance: `حضور الموظفين`, teacherAttendanceReport: 'تقرير حضور المعلمين', supervisorAttendanceReport: 'تقرير حضور المشرفين',
        dailyStudents: 'التقرير اليومي (طلاب)', dailyCircles: 'التقرير اليومي (حلقات)', exam: `إدخال درجات الاختبار`, examReport: 'تقرير الاختبارات',
        studentFollowUp: 'متابعة طالب', studentAttendanceReport: 'تقرير حضور الطلاب اليومي', studentAbsenceReport: 'تقرير غياب الطلاب', settings: 'الإعدادات', teacherList: 'قائمة المعلمين',
    };

    const renderPage = () => {
        if (error) return (
            <div className="flex flex-col justify-center items-center h-full p-4 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="bg-amber-500 text-white px-4 py-2 rounded">إعادة المحاولة</button>
            </div>
        );

        switch (currentPage) {
            case 'students': return <StudentReportPage students={students} initialFilter={initialStudentFilter} clearInitialFilter={() => setInitialStudentFilter(null)} />;
            case 'circles': return <CircleReportPage students={students} supervisors={supervisors} />;
            case 'general': return <GeneralReportPage students={students} dailyStudents={dailyStudents} settings={settings} />;
            case 'dashboard': return <DashboardPage students={students} onCircleSelect={handleCircleSelect} supervisors={supervisors} />;
            case 'dailyDashboard': return <DailyDashboardPage students={dailyStudents} onCircleSelect={handleDailyCircleSelect} supervisors={supervisors} />;
            case 'notes': return <NotesPage students={students} />;
            case 'evaluation': return authenticatedUser && <EvaluationPage onSubmit={handlePostEvaluation} isSubmitting={isSubmitting} authenticatedUser={authenticatedUser} evalQuestions={evalQuestions} evalResults={evalResults} evalHeaderMap={evalHeaderMap} dailyStudents={dailyStudents} settings={settings} />;
            case 'excellence': return <ExcellencePage students={students} supervisors={supervisors} />;
            case 'combinedAttendance': return <CombinedAttendancePage allTeachers={asrTeachersInfo} teacherAttendanceStatus={teacherAttendance} onTeacherSubmit={handlePostTeacherAttendance} submittingTeacher={submittingTeacher} allSupervisors={supervisors.map(s => ({ id: s.id, name: s.supervisorName }))} supervisorAttendanceStatus={supervisorAttendance} onSupervisorSubmit={handlePostSupervisorAttendance} submittingSupervisor={submittingSupervisor} isSubmitting={isSubmitting} authenticatedUser={authenticatedUser} />;
            case 'teacherAttendanceReport': return <TeacherAttendanceReportPage reportData={combinedTeacherAttendanceLog} onRefresh={handleRefreshTeacherData} isRefreshing={isBackgroundUpdating} />;
            case 'supervisorAttendanceReport': return <SupervisorAttendanceReportPage reportData={supervisorAttendanceReport} />;
            case 'dailyStudents': return <DailyStudentReportPage students={dailyStudents} />;
            case 'dailyCircles': return <DailyCircleReportPage students={dailyStudents} supervisors={supervisors} />;
            case 'exam': return authenticatedUser && <ExamPage onSubmit={handlePostExam} isSubmitting={isSubmitting} students={registeredStudents} authenticatedUser={authenticatedUser} />;
            case 'examReport': return <ExamReportPage examData={examData} />;
            case 'studentFollowUp': return <StudentFollowUpPage students={students} />;
            case 'studentAttendanceReport': return <StudentAttendanceReportPage students={dailyStudents} />;
            case 'studentAbsenceReport': return <StudentAbsenceReportPage students={dailyStudents} />;
            case 'settings': return authenticatedUser && <SettingsPage settings={settings} onSave={handlePostSettings} isSubmitting={isSubmitting} dailyStudents={dailyStudents} />;
            case 'teacherList': return <TeacherListPage students={students} />;
            default: return <GeneralReportPage students={students} dailyStudents={dailyStudents} settings={settings} />;
        }
    };
    
    return (
        <div className="flex h-screen bg-stone-100" dir="rtl">
            <div className={`print-hidden lg:flex lg:flex-shrink-0 fixed lg:relative inset-y-0 right-0 z-40 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}>
                <Sidebar currentPage={currentPage} onNavigate={handleNavigation} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(prev => !prev)} authenticatedUser={authenticatedUser} />
            </div>
            {isMobileSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} aria-hidden="true"></div>}
            <main className={`flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300`}>
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 p-4 md:p-6 border-b border-stone-200 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold text-stone-800">{titles[currentPage]}</h1>
                        <button 
                            onClick={handleManualRefresh} 
                            disabled={isBackgroundUpdating}
                            title="تحديث البيانات من الخادم"
                            className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition-colors disabled:opacity-50"
                        >
                            <RefreshIcon className={`w-5 h-5 ${isBackgroundUpdating ? 'animate-spin text-amber-500' : ''}`} />
                        </button>
                        {isBackgroundUpdating && <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse">جاري التحديث...</span>}
                    </div>
                    <button className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-md" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open sidebar"><MenuIcon className="w-6 h-6" /></button>
                </header>
                <div className="p-4 md:p-6 h-full">{renderPage()}</div>
            </main>
            {showPasswordModal && <PasswordModal onSuccess={(user) => { setAuthenticatedUser(user); setShowPasswordModal(false); if (currentPage === 'settings' && user.role !== 'admin') { setNotification({ message: 'ليس لديك صلاحية.', type: 'error' }); setCurrentPage('general'); } else if (currentPage === 'exam' && !['admin', 'exam_teacher'].includes(user.role)) { setNotification({ message: 'صلاحية مرفوضة.', type: 'error' }); setCurrentPage('general'); } }} onClose={() => { setShowPasswordModal(false); if (['evaluation', 'exam', 'settings'].includes(currentPage)) setCurrentPage('general'); }} supervisors={supervisors} productors={productors} teachersInfo={teachersInfo} />}
            <Notification notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
};

export default App;
