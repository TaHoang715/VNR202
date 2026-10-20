import { describe, it, expect } from 'vitest';
import {
  QUIZ_QUESTIONS,
  QUIZ_CONSTANTS,
  calculateQuestionScore,
  evaluateAnswer,
  normalizeCatchphrase,
  sanitizeQuestionForClient,
  extractRevealData,
} from './data/quizData';

describe('Giải mã kháng chiến — Client Quiz Engine & Questions Suite', () => {
  // ─── 1. Scoring Semantics (floor(serverRemainingMs/10) max 6000) ───────
  describe('calculateQuestionScore', () => {
    it('awards 6000 points for correct answer submitted instantly (60s remaining)', () => {
      const res = calculateQuestionScore(true, 60000, 60000);
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBe(6000);
    });

    it('awards 3000 points for correct answer submitted at mid-point (30s remaining)', () => {
      const res = calculateQuestionScore(true, 30000, 60000);
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBe(3000);
    });

    it('awards 0 points for correct answer submitted at 0s remaining', () => {
      const res = calculateQuestionScore(true, 0, 60000);
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBe(0);
    });

    it('awards 0 points for any incorrect answer regardless of remaining time', () => {
      const resInstant = calculateQuestionScore(false, 60000, 60000);
      expect(resInstant.isCorrect).toBe(false);
      expect(resInstant.points).toBe(0);

      const resLate = calculateQuestionScore(false, 15000, 60000);
      expect(resLate.isCorrect).toBe(false);
      expect(resLate.points).toBe(0);
    });

    it('clamps remaining time within [0, timeLimitMs]', () => {
      const overTime = calculateQuestionScore(true, 75000, 60000);
      expect(overTime.points).toBe(6000);

      const negativeTime = calculateQuestionScore(true, -5000, 60000);
      expect(negativeTime.points).toBe(0);
    });
  });

  // ─── 2. Question Answer Evaluation & Catchphrase Normalization ────────
  describe('evaluateAnswer & normalizeCatchphrase', () => {
    it('evaluates choice questions strictly by exact ID or exact full text', () => {
      const q1 = QUIZ_QUESTIONS[0]; // choice Q1, correct B
      expect(evaluateAnswer(q1, 'B')).toBe(true);
      expect(evaluateAnswer(q1, 'b')).toBe(true);
      expect(evaluateAnswer(q1, 'B. Quyết định phát động cuộc kháng chiến toàn quốc trong toàn dân, toàn quân')).toBe(true);
      expect(evaluateAnswer(q1, 'Quyết định phát động cuộc kháng chiến toàn quốc trong toàn dân, toàn quân')).toBe(true);
      // Rejects arbitrary prefixes or bogus strings starting with B
      expect(evaluateAnswer(q1, 'BOGUS')).toBe(false);
      expect(evaluateAnswer(q1, 'B. Quyết định...')).toBe(false);
      expect(evaluateAnswer(q1, 'A')).toBe(false);
      expect(evaluateAnswer(q1, '')).toBe(false);
      expect(evaluateAnswer(q1, null)).toBe(false);
    });

    it('normalizes accents, casing, and whitespace variants for catchphrases', () => {
      expect(normalizeCatchphrase('Toàn dân')).toBe('toan dan');
      expect(normalizeCatchphrase('  TOÀN   DÂN  ')).toBe('toan dan');
      expect(normalizeCatchphrase('toan dan')).toBe('toan dan');
      expect(normalizeCatchphrase('Tự Lực Cánh Sinh')).toBe('tu luc canh sinh');
      expect(normalizeCatchphrase('TU LUC CANH SINH')).toBe('tu luc canh sinh');
      expect(normalizeCatchphrase('Biên giới')).toBe('bien gioi');
      expect(normalizeCatchphrase('BIEN GIOI')).toBe('bien gioi');
      expect(normalizeCatchphrase('Trường kỳ')).toBe('truong ky');
      expect(normalizeCatchphrase('Toàn diện')).toBe('toan dien');
    });

    it('evaluates all 5 catchphrase questions accurately with accented and unaccented input', () => {
      const catchphrases = QUIZ_QUESTIONS.filter((q) => q.type === 'catchphrase');
      expect(catchphrases).toHaveLength(5);

      const expectedAnswers = [
        'Toàn dân',
        'Toàn diện',
        'Trường kỳ',
        'Tự lực cánh sinh',
        'Biên giới',
      ];

      catchphrases.forEach((q, idx) => {
        const expected = expectedAnswers[idx];
        expect(q.correctAnswer).toBe(expected);

        // Standard exact match
        expect(evaluateAnswer(q, expected)).toBe(true);
        // Lowercase unaccented
        expect(evaluateAnswer(q, normalizeCatchphrase(expected))).toBe(true);
        // Uppercase unaccented
        expect(evaluateAnswer(q, normalizeCatchphrase(expected).toUpperCase())).toBe(true);
        // Extra spaces
        expect(evaluateAnswer(q, `  ${expected}   `)).toBe(true);
        // Wrong answer
        expect(evaluateAnswer(q, 'sai đáp án')).toBe(false);
      });
    });
  });

  // ─── 3. Client Sanitization & Security ────────────────────────────────
  describe('Question Confidentiality and Sanitization', () => {
    it('strips all sensitive answer keys and explanations for client question phase', () => {
      for (const q of QUIZ_QUESTIONS) {
        const clientQ = sanitizeQuestionForClient(q);

        expect(clientQ.id).toBe(q.id);
        expect(clientQ.type).toBe(q.type);
        expect(clientQ.prompt).toBe(q.prompt);

        // Answers and explanations MUST be undefined
        const raw = clientQ as any;
        expect(raw.correctOptionId).toBeUndefined();
        expect(raw.correctAnswer).toBeUndefined();
        expect(raw.explanation).toBeUndefined();
        expect(raw.sourceNote).toBeUndefined();

        // For catchphrase, letterHint is provided but does NOT contain full answer
        if (q.type === 'catchphrase') {
          expect(clientQ.letterHint).toBeDefined();
          expect(clientQ.letterHint!.wordLengths.length).toBeGreaterThan(0);
          expect(JSON.stringify(clientQ.letterHint)).not.toContain(q.correctAnswer!);
        }
      }
    });

    it('extracts complete reveal data when transitioning to reveal phase', () => {
      for (const q of QUIZ_QUESTIONS) {
        const reveal = extractRevealData(q);
        expect(reveal.questionId).toBe(q.id);
        expect(reveal.explanation.length).toBeGreaterThan(10);
        expect(reveal.sourceNote.length).toBeGreaterThan(5);

        if (q.type === 'choice') {
          expect(reveal.correctOptionId).toBe(q.correctOptionId);
        } else if (q.type === 'catchphrase') {
          expect(reveal.correctAnswer).toBe(q.correctAnswer);
        }
      }
    });
  });

  // ─── 4. Full 10 Questions Content Integrity ───────────────────────────
  describe('10 Sourced History Questions (1946–1950) Content Integrity', () => {
    it('contains exactly 10 questions alternating 5 choices and 5 catchphrases', () => {
      expect(QUIZ_QUESTIONS).toHaveLength(10);
      QUIZ_QUESTIONS.forEach((q, idx) => {
        expect(q.id).toBe(idx + 1);
        if (idx % 2 === 0) {
          expect(q.type).toBe('choice');
        } else {
          expect(q.type).toBe('catchphrase');
        }
      });
    });

    it('verifies all catchphrase questions have real historical photos and metadata', () => {
      const catchphrases = QUIZ_QUESTIONS.filter((q) => q.type === 'catchphrase');
      for (const cp of catchphrases) {
        expect(cp.photo).toBeDefined();
        expect(cp.photo!.src).toMatch(/images\/(history|game)\//);
        expect(cp.photo!.caption.length).toBeGreaterThan(10);
        expect(cp.photo!.credit.length).toBeGreaterThan(5);
        expect(cp.photo!.date.length).toBeGreaterThan(3);
        expect(cp.photo!.source).toMatch(/^https?:\/\//);
      }

      // Verify Q4 uses the authentic Ty Tuyên truyền Thái Nguyên poster
      const q4 = QUIZ_QUESTIONS[3];
      expect(q4.photo?.src).toBe('images/game/san-xuat-hoc-chu.jpg');
      expect(q4.photo?.caption).toContain('Ty Tuyên truyền văn nghệ Thái Nguyên');
    });
  });
});
