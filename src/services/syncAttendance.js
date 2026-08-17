import { storage } from "./storage";

export function processAttendanceJson(data) {
    if (!data || !data.data || !Array.isArray(data.data.report)) {
        throw new Error("Invalid attendance report data structure. Make sure you copied the correct JSON.");
    }

    let addedCount = 0;

    // 🔹 Parse Linways JSON structure and store into your system
    data.data.report.forEach(day => {
        const rawDate = day.attendance_date; // e.g. "07-01-2026"
        if (!rawDate) return;

        // Convert DD-MM-YYYY to YYYY-MM-DD for storage
        const parts = rawDate.split("-");
        if (parts.length !== 3) return;
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

        if (day.hourDetails && Array.isArray(day.hourDetails)) {
            day.hourDetails.forEach(hourDetail => {
                const hourStr = hourDetail.markedHour;
                if (!hourStr) return;
                const hour = parseInt(hourStr, 10);

                if (hourDetail.subjectDetails && Array.isArray(hourDetail.subjectDetails)) {
                    hourDetail.subjectDetails.forEach(subj => {
                        if (!subj.subjectName) return;

                        // Clean subject name by removing trailing course codes like "( CSE2274 )"
                        let cleanSubject = subj.subjectName;
                        if (cleanSubject.includes('(')) {
                            cleanSubject = cleanSubject.split('(')[0].trim();
                        }

                        // Determine status
                        // Linways usually uses "1" for Present, "0" for Absent
                        let status = "unmarked";
                        if (String(subj.attendanceStatus) === "1") {
                            status = "present";
                        } else if (String(subj.attendanceStatus) === "0") {
                            status = "absent";
                        }

                        // Also consider duty leave or grant leave
                        if (subj.dutyLeave === "1" || subj.grantLeave === "1") {
                            status = "present";
                        }

                        if (status !== "unmarked") {
                            storage.addRecord({
                                date: formattedDate,
                                subject: cleanSubject,
                                hour: hour,
                                status: status
                            });
                            addedCount++;
                        }
                    });
                }
            });
        }
    });

    // 🔹 Save last sync time
    localStorage.setItem("last_sync_time", new Date().toISOString());

    return addedCount;
}

export async function syncAttendance() {
    try {
        // 🔹 Get user profile (dynamic studentId)
        const studentId = "20789"; // 🔥 your actual studentId from Linways

        // 🔹 Date range (last 30 days for performance)
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 30);

        const params = encodeURIComponent(JSON.stringify({
            toDate: today.toISOString().split("T")[0],
            fromDate: fromDate.toISOString().split("T")[0],
            emitAsResetWhileReset: true,
            studentId: String(studentId)
        }));

        const url = `https://presidencyuniversity.linways.com/academics/api/v1/attendance/daily-attendance/?params=${params}`;

        const res = await fetch(url, {
            method: "GET",
            credentials: "include"
        });

        const data = await res.json();
        
        try {
            const addedCount = processAttendanceJson(data);
            console.log(`✅ Attendance synced successfully. Processed ${addedCount} records.`);
        } catch (parseErr) {
            console.warn(parseErr.message);
        }

    } catch (err) {
        console.error("❌ Sync failed:", err);
    }
}