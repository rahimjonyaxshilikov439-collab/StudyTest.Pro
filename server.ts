import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AttemptRecord, DatabaseState, StudentRecord } from './src/types.ts';
import {
  buildStudentNormalizedKey,
  normalizeNameToken,
  validateAndAnalyzeStudentName,
} from './src/utils/nameValidation.ts';
import { DEFAULT_SETTINGS } from './src/utils/storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDb(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseState = {
      students: [],
      attempts: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      settings: {
        timerMinutes:
          typeof parsed.settings?.timerMinutes === 'number' &&
          parsed.settings.timerMinutes >= 1 &&
          parsed.settings.timerMinutes <= 120
            ? parsed.settings.timerMinutes
            : DEFAULT_SETTINGS.timerMinutes,
        teacherPassword: parsed.settings?.teacherPassword || DEFAULT_SETTINGS.teacherPassword,
        cheaterPassword: parsed.settings?.cheaterPassword || DEFAULT_SETTINGS.cheaterPassword,
      },
    };
  } catch {
    const fallback: DatabaseState = {
      students: [],
      attempts: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function writeDb(db: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/bootstrap', (_req, res) => {
    const db = ensureDb();
    res.json(db);
  });

  app.post('/api/students/enter', (req, res) => {
    const { fullName, className } = (req.body ?? {}) as {
      fullName?: string;
      className?: string;
    };

    if (!className || typeof className !== 'string') {
      res.status(400).json({ ok: false, errorType: 'incomplete', message: 'Sinfni tanlang' });
      return;
    }

    const db = ensureDb();
    const analysis = validateAndAnalyzeStudentName(fullName ?? '', className, db.students);
    if (!analysis.ok) {
      res.status(400).json(analysis);
      return;
    }

    const now = new Date().toISOString();
    if (analysis.existingStudent) {
      const updatedStudents = db.students.map((s) =>
        s.id === analysis.existingStudent!.id ? { ...s, lastLoginAt: now } : s,
      );
      const student = updatedStudents.find((s) => s.id === analysis.existingStudent!.id)!;
      const nextDb: DatabaseState = { ...db, students: updatedStudents };
      writeDb(nextDb);
      res.json({ student, isReturning: true, db: nextDb });
      return;
    }

    const newStudent: StudentRecord = {
      id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      firstName: analysis.firstName,
      lastName: analysis.lastName,
      fullName: analysis.fullName,
      normalizedKey:
        analysis.normalizedKey ||
        buildStudentNormalizedKey(normalizeNameToken(analysis.fullName), className),
      className,
      createdAt: now,
      lastLoginAt: now,
    };
    const nextDb: DatabaseState = {
      ...db,
      students: [...db.students, newStudent],
    };
    writeDb(nextDb);
    res.json({ student: newStudent, isReturning: false, db: nextDb });
  });

  app.post('/api/attempts', (req, res) => {
    const attempt = req.body as AttemptRecord;
    if (!attempt || !attempt.studentId || !attempt.unitId) {
      res.status(400).json({ error: 'Noto‘g‘ri urinish ma’lumotlari' });
      return;
    }

    const db = ensureDb();
    const nextDb: DatabaseState = {
      ...db,
      attempts: [...db.attempts, attempt],
    };
    writeDb(nextDb);
    res.json({ ok: true, db: nextDb });
  });

  app.post('/api/teacher/login', (req, res) => {
    const { password } = (req.body ?? {}) as { password?: string };
    const db = ensureDb();
    res.json({ ok: password === db.settings.teacherPassword });
  });

  app.delete('/api/teacher/students/:id', (req, res) => {
    const studentId = req.params.id;
    const db = ensureDb();
    const nextDb: DatabaseState = {
      ...db,
      students: db.students.filter((s) => s.id !== studentId),
      attempts: db.attempts.filter((a) => a.studentId !== studentId),
    };
    writeDb(nextDb);
    res.json({ ok: true, db: nextDb });
  });

  app.patch('/api/teacher/settings', (req, res) => {
    const patch = (req.body ?? {}) as Partial<DatabaseState['settings']>;
    const db = ensureDb();
    const nextDb: DatabaseState = {
      ...db,
      settings: {
        timerMinutes:
          typeof patch.timerMinutes === 'number'
            ? Math.min(120, Math.max(1, Math.round(patch.timerMinutes)))
            : db.settings.timerMinutes,
        teacherPassword:
          typeof patch.teacherPassword === 'string' && patch.teacherPassword.trim()
            ? patch.teacherPassword.trim()
            : db.settings.teacherPassword,
        cheaterPassword:
          typeof patch.cheaterPassword === 'string' && patch.cheaterPassword.trim()
            ? patch.cheaterPassword.trim()
            : db.settings.cheaterPassword,
      },
    };
    writeDb(nextDb);
    res.json({ ok: true, db: nextDb });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`VocabCheck server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
