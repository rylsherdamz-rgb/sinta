import { getDb } from "@/lib/server/db";

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  created_at: number;
}

export function searchKnowledge(
  query: string,
  maxResults: number = 3
): KnowledgeArticle[] {
  const db = getDb();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  let rows = db.prepare("SELECT * FROM knowledge_base ORDER BY created_at DESC").all() as KnowledgeArticle[];

  const scored = rows
    .map((row) => {
      let score = 0;
      const title = (row.title || "").toLowerCase();
      const content = (row.content || "").toLowerCase();
      const tags = (row.tags || "").toLowerCase();
      const combined = `${title} ${tags} ${content}`;

      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (tags.includes(term)) score += 5;
        const contentMatches = (content.match(new RegExp(term, "gi")) || []).length;
        score += contentMatches;
        if (combined.includes(term)) score += 1;
      }

      return { row, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((s) => s.row);
}

export function addKnowledgeArticle(params: {
  title: string;
  content: string;
  category?: string;
  tags?: string;
}): KnowledgeArticle {
  const db = getDb();
  const { v4: uuid } = require("uuid");

  const article: KnowledgeArticle = {
    id: uuid(),
    title: params.title,
    content: params.content,
    category: params.category || null,
    tags: params.tags || null,
    created_at: Date.now(),
  };

  db.prepare(
    `INSERT INTO knowledge_base (id, title, content, category, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    article.id,
    article.title,
    article.content,
    article.category,
    article.tags,
    article.created_at
  );

  return article;
}

export function seedKnowledgeBase() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as cnt FROM knowledge_base").get() as { cnt: number };
  if (count.cnt > 0) return;

  const articles = [
    {
      title: "How to Request a Transcript",
      content:
        "To request your official transcript, you must first verify your identity. You can do this by taking a selfie or uploading your school ID through the verification prompt. Once verified, tell Sinta which transcript you need (e.g., 'I need my Grade 10 transcript'). Transcripts are available for Grades 7-10. Processing takes 1-3 business days for printed copies, but digital copies are available immediately through Sinta.",
      category: "documents",
      tags: "transcript, grades, academic record, request, official",
    },
    {
      title: "Enrollment Certificate FAQ",
      content:
        "An enrollment certificate (also called a certificate of enrollment or certificate of registration) proves you are currently enrolled at the school. It includes your name, student ID, grade level, and enrollment date. This is commonly needed for bank accounts, visa applications, and government IDs. Tell Sinta 'I need an enrollment certificate' after verifying your identity. Certificates are generated instantly for verified students.",
      category: "documents",
      tags: "enrollment, certificate, registration, proof, enrollment certificate, bank, visa, government",
    },
    {
      title: "Bank Statement for Student Accounts",
      content:
        "Some students need bank statements or proof of enrollment for scholarship applications or bank account openings. Sinta can provide a school-issued bank statement that confirms your enrollment and tuition status. This is different from a bank's financial statement — it is a document from the school confirming your account standing. Request it by saying 'I need a bank statement' after identity verification.",
      category: "documents",
      tags: "bank statement, financial, scholarship, tuition, account, proof",
    },
    {
      title: "School ID Replacement",
      content:
        "If you lost your school ID, Sinta can issue a digital replacement after verifying your identity. The digital school ID includes your photo, name, student number, and grade level. To get a replacement, verify your identity first, then say 'I need a replacement school ID'. Note: physical ID cards must be requested at the registrar's office. Sinta only provides digital copies.",
      category: "documents",
      tags: "school ID, ID card, lost ID, replacement, digital ID, student ID",
    },
    {
      title: "Identity Verification Process",
      content:
        "Before accessing any school documents, you must verify your identity. Sinta offers two methods: 1) Face verification — take a selfie using your device camera. 2) ID card upload — upload a photo of your school ID or government ID. The system checks image quality, format, and basic validity. Verification is valid for the current session. For security, each document request requires verification. If verification fails, try better lighting or a clearer photo.",
      category: "verification",
      tags: "verify, identity, selfie, ID card, face, authentication, security",
    },
    {
      title: "Document Pickup and Delivery",
      content:
        "Digital documents are available immediately after verification and can be downloaded directly from Sinta. For printed or notarized documents, processing takes 1-3 business days. You can pick up printed documents at the Registrar's Office (Room 101, Main Building) from 8AM-5PM on weekdays. Some documents can be mailed to your address on file — ask Sinta to create a support ticket for special delivery requests.",
      category: "documents",
      tags: "pickup, delivery, printed, notarized, registrar, processing time, download",
    },
    {
      title: "School Hours and Contact Info",
      content:
        "The school is open Monday to Friday, 7:00 AM to 6:00 PM. The Registrar's Office (Room 101) handles document requests, enrollment, and student records — open 8AM-5PM. The Guidance Office (Room 205) handles counseling, schedule changes, and academic concerns. For urgent matters, call the main office at (02) 1234-5678 or email registrar@sinta-school.edu. Sinta is available 24/7 for digital document requests.",
      category: "general",
      tags: "hours, contact, phone, email, registrar, office, schedule, location",
    },
    {
      title: "Enrollment Period and Requirements",
      content:
        "Enrollment for the next school year typically opens in March. Requirements: 1) Report card from previous year. 2) Certificate of Good Moral Character. 3) 2x2 ID photos (2 pieces). 4) PSA birth certificate (photocopy). 5) For transferees: transcript of records and honorable dismissal. Late enrollment may incur additional fees. Contact the Registrar's Office for specific dates and fee schedules.",
      category: "enrollment",
      tags: "enrollment, register, requirements, documents, transferee, admission, fees",
    },
  ];

  const insert = db.prepare(
    `INSERT INTO knowledge_base (id, title, content, category, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction(() => {
    const { v4: uuid } = require("uuid");
    for (const article of articles) {
      insert.run(
        uuid(),
        article.title,
        article.content,
        article.category,
        article.tags,
        Date.now()
      );
    }
  });

  insertMany();
}