// utils/pdf/exportMonthlyReportToPDF.js (or existing file you showed)
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

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  doc.text(`Total Worked: ${totalHours}h ${totalMins}m`, 14, 40);

  const totalLate = records.reduce((s, r) => s + (r.totalLateMinutes ?? 0), 0);
  const totalOT = records.reduce((s, r) => s + (r.totalOvertimeMinutes ?? 0), 0);

  doc.text(`Total Late: ${fmtHM(totalLate)}`, 14, 47);
  doc.text(`Total Overtime: ${fmtHM(totalOT)}`, 14, 54);

  const tableData = records.map((att) => {
    let dayTotal = 0;
    const punches = att.punches.map((p) => {
      let durationStr = "";
      if (p.inTime && p.outTime) {
        const [inH, inM] = p.inTime.split(":").map(Number);
        const [outH, outM] = p.outTime.split(":").map(Number);
        const duration = outH * 60 + outM - (inH * 60 + inM);
        if (duration > 0) dayTotal += duration;
        const dH = Math.floor(duration / 60);
        const dM = duration % 60;
        durationStr = ` (${dH}h ${dM}m)`;
      }
      return `In: ${p.inTime || "--"} Out: ${p.outTime || "--"}${durationStr}`;
    });

    const dH = Math.floor(dayTotal / 60);
    const dM = dayTotal % 60;

    return [
      att.date,
      punches.join("\n"),
      `${dH}h ${dM}m`,
      fmtHM(att.totalLateMinutes ?? 0),
      fmtHM(att.totalOvertimeMinutes ?? 0),
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
