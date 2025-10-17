import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportMonthlyReportToPDF = (user, records, totalMinutes) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Monthly Attendance Report`, 14, 15);


  doc.setFontSize(12);
  doc.text(`Name: ${user?.fullName || "N/A"}`, 14, 25);
  doc.text(`Email: ${user?.email || "N/A"}`, 14, 32);

  console.log("User passed to PDF export:", user);

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  doc.text(`Total Worked: ${totalHours}h ${totalMins}m`, 14, 40);

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

    return [att.date, punches.join("\n"), `${dH}h ${dM}m`];
  });

  autoTable(doc, {
    startY: 50,
    head: [["Date", "Punches", "Worked"]],
    body: tableData,
    styles: { fontSize: 10 },
  });

  doc.save(`${user?.fullName || "employee"}-monthly-attendance.pdf`);
};
