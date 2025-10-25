// utils/pdf/exportMonthlyReportToPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function fmtHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export const exportMonthlyReportToPDF = (user, records, totalMinutes) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Monthly Attendance Report`, 14, 15);

  doc.setFontSize(12);
  doc.text(`Name: ${user?.fullName || "N/A"}`, 14, 25);
  doc.text(`Email: ${user?.email || "N/A"}`, 14, 32);

  // totalMinutes passed in now excludes overtime (from backend summary)
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  doc.text(`Total Worked (Regular): ${totalHours}h ${totalMins}m`, 14, 40);

  const totalLate = records.reduce((s, r) => s + (r.totalLateMinutes ?? 0), 0);
  const totalOT = records.reduce((s, r) => s + (r.totalOvertimeMinutes ?? 0), 0);

  doc.text(`Total Late: ${fmtHM(totalLate)}`, 14, 47);
  doc.text(`Total Overtime: ${fmtHM(totalOT)}`, 14, 54);

  const tableData = records.map((att) => {
    // Use backend-computed dayMinutes (excludes overtime)
    const dayWorked = att.dayMinutes ?? att.totalMinutes ?? 0;

    // Format punch times for display
    const punches = att.punches.map((p) => {
      return `In: ${p.inTime || "--"} Out: ${p.outTime || "--"}`;
    });

    return [
      att.date,
      punches.join("\n"),
      fmtHM(dayWorked),                         // Regular worked hours (excludes OT)
      fmtHM(att.totalLateMinutes ?? 0),         // Late minutes
      fmtHM(att.totalOvertimeMinutes ?? 0),     // Overtime minutes
    ];
  });

  autoTable(doc, {
    startY: 62,
    head: [["Date", "Punches", "Worked", "Late", "Overtime"]],
    body: tableData,
    styles: { fontSize: 10 },
  });

  doc.save(`${user?.fullName || "employee"}-monthly-attendance.pdf`);
};
