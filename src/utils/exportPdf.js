// utils/pdf/exportMonthlyReportToPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function fmtHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export const exportMonthlyReportToPDF = (
  user,
  records,
  totalMinutes,
  totalLateMinutes = 0,
  lateMarkCount = 0,
  halfDayDeductions = 0
) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Monthly Attendance Report`, 14, 15);

  doc.setFontSize(12);
  doc.text(`Name: ${user?.fullName || "N/A"}`, 14, 25);
  doc.text(`Email: ${user?.email || "N/A"}`, 14, 32);

  // Display total worked (already calculated from backend with caps and deductions)
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  doc.text(
    `Total Worked (Capped): ${totalHours}h ${totalMins}m`,
    14,
    40
  );

  // Display late metrics
  doc.text(`Total Late Time: ${fmtHM(totalLateMinutes)}`, 14, 47);
  doc.text(`Late Marks: ${lateMarkCount}`, 14, 54);
  doc.text(`Half-Day Deductions: ${halfDayDeductions}`, 14, 61);

  const tableData = records.map((att) => {
    // Use backend-computed dayMinutes (already accounts for shift cap and half-day deductions)
    const dayWorked = att.dayMinutes ?? att.totalMinutes ?? 0;

    // Format punch times for display
    const punches = att.punches.map((p) => {
      const inTime = p.inTime ? p.inTime : "--";
      const outTime = p.outTime ? p.outTime : "--";
      return `In: ${inTime} Out: ${outTime}`;
    });

    const lateStatus =
      att.punches.some((p) => p.lateMark) &&
      att.punches.find((p) => p.lateMark)
        ? `Yes (+${att.punches.find((p) => p.lateMark).lateMinutes || 0}m)`
        : "No";

    const halfDayStatus = att.isHalfDayDeducted ? "✓ Deducted" : "No";

    return [
      att.date,
      punches.join(" | "),
      fmtHM(dayWorked), // Worked hours (capped at shift, with deductions applied)
      fmtHM(att.totalLateMinutes ?? 0), // Late minutes for the day
      lateStatus, // Late mark status
      halfDayStatus, // Half-day deduction status
    ];
  });

  autoTable(doc, {
    startY: 70,
    head: [["Date", "Punches", "Worked", "Late Time", "Late", "Half-Day"]],
    body: tableData,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
  });

  // Add footer with summary
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  doc.save(`${user?.fullName || "employee"}-monthly-attendance.pdf`);
};
