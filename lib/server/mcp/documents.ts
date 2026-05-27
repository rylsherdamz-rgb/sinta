import { getDb } from "@/lib/server/db";
import { v4 as uuid } from "uuid";

export interface SchoolDocument {
  id: string;
  doc_type: string;
  title: string;
  description: string | null;
  file_data: string | null;
  file_name: string | null;
  mime_type: string | null;
  status: string;
  created_at: number;
}

export function getAvailableDocuments(docType?: string): SchoolDocument[] {
  const db = getDb();
  if (docType) {
    return db.prepare("SELECT * FROM documents WHERE doc_type = ? AND status = 'available' ORDER BY created_at DESC").all(docType) as SchoolDocument[];
  }
  return db.prepare("SELECT * FROM documents WHERE status = 'available' ORDER BY created_at DESC").all() as SchoolDocument[];
}

export function getDocumentById(docId: string): SchoolDocument | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM documents WHERE id = ?").get(docId) as SchoolDocument) || null;
}

export function seedSchoolDocuments() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as cnt FROM documents").get() as { cnt: number }).cnt;
  if (count > 0) return;

  const docs = db.transaction(() => {
    const insert = db.prepare(`
      INSERT INTO documents (id, doc_type, title, description, file_data, file_name, mime_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const students = [
      { name: "Juan Dela Cruz", id: "2024-00123", course: "BS Computer Science" },
      { name: "Maria Santos", id: "2024-00456", course: "BS Accountancy" },
      { name: "Pedro Reyes", id: "2023-00789", course: "BS Civil Engineering" },
    ];

    for (const s of students) {
      const now = Date.now();

      // Transcript
      const transcriptText = `
OFFICIAL TRANSCRIPT OF RECORDS
University of the Philippines - Diliman
===========================================
Student Name: ${s.name}
Student ID: ${s.id}
Course: ${s.course}
Date of Issue: ${new Date().toLocaleDateString()}
===========================================
FIRST SEMESTER (AY 2024-2025)
CS 101 - Intro to Programming ......... 1.25
MATH 21 - Calculus I ................. 1.50
ENG 13 - Academic Writing ............ 1.75
PE 2 - Physical Fitness .............. PASS
NSTP 1 - Civic Welfare ............... PASS
GWA: 1.50
===========================================
SECOND SEMESTER (AY 2024-2025)
CS 102 - Data Structures ............. 1.25
MATH 22 - Calculus II ................ 1.75
PHYS 71 - University Physics ......... 1.50
FIL 40 - Wika at Kultura ............. 1.25
GWA: 1.44
===========================================
This is an official document issued by UP Diliman.
Verification Code: UP-${s.id}-${Date.now().toString(36).toUpperCase()}
`.trim();

      insert.run(uuid(), "transcript", `Transcript - ${s.name}`, `Official Transcript of Records for ${s.name} (${s.id})`, transcriptText, `transcript_${s.id}.txt`, "text/plain", "available", now);

      // Enrollment Certificate
      const enrollmentText = `
CERTIFICATE OF ENROLLMENT
University of the Philippines - Diliman
===========================================
Student Name: ${s.name}
Student ID: ${s.id}
Course: ${s.course}
Academic Year: 2024-2025
Semester: Second Semester
===========================================
ENROLLED SUBJECTS:
1. CS 102 - Data Structures (4 units)
2. MATH 22 - Calculus II (3 units)
3. PHYS 71 - University Physics (4 units)
4. FIL 40 - Wika at Kultura (3 units)
5. HIST 1 - Philippine History (3 units)
6. STS 1 - Science & Society (3 units)
Total Units: 20
===========================================
Certified by: Office of the University Registrar
Date: ${new Date().toLocaleDateString()}
`.trim();

      insert.run(uuid(), "enrollment", `Certificate of Enrollment - ${s.name}`, `Enrollment certificate for ${s.name}, 2nd Semester AY 2024-2025`, enrollmentText, `enrollment_${s.id}.txt`, "text/plain", "available", now);

      // Bank Statement
      const bankText = `
BANK STATEMENT
University Student Account
Bank of the Philippine Islands
===========================================
Account Holder: ${s.name}
Student ID: ${s.id}
Account Number: XXXX-XXXX-${Math.floor(Math.random() * 9000) + 1000}
Period: Last 3 Months
===========================================
DATE          DESCRIPTION              DEBIT      CREDIT     BALANCE
Jan 15, 2026  Tuition Payment           25,000.00  -         PHP 50,000.00
Jan 20, 2026  Lab Fee                   2,500.00   -         PHP 47,500.00
Feb 01, 2026  Scholarship Grant         -          15,000.00 PHP 62,500.00
Feb 15, 2026  Library Fee               500.00     -         PHP 62,000.00
Mar 01, 2026  Dormitory Fee             5,000.00   -         PHP 57,000.00
Mar 15, 2026  Student Loan Disbursement -          20,000.00 PHP 77,000.00
===========================================
Current Balance: PHP 77,000.00
Statement Generated: ${new Date().toLocaleDateString()}
`.trim();

      insert.run(uuid(), "bank_statement", `Bank Statement - ${s.name}`, `3-month bank statement for ${s.name}`, bankText, `bank_stmt_${s.id}.txt`, "text/plain", "available", now);

      // School ID
      const idText = `
SCHOOL ID DETAILS
University of the Philippines - Diliman
===========================================
ID Card Issued To: ${s.name}
Student Number: ${s.id}
Course: ${s.course}
Valid Until: May 2027
Status: ACTIVE
===========================================
This ID is property of UP Diliman and must be
presented upon request by university officials.
`.trim();

      insert.run(uuid(), "school_id", `School ID - ${s.name}`, `School ID details for ${s.name}`, idText, `school_id_${s.id}.txt`, "text/plain", "available", now);
    }
  });

  docs();
}