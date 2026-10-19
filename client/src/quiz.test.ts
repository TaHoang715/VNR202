import { describe, it, expect } from 'vitest';
import {
  QUIZ_QUESTIONS,
  QUIZ_CONSTANTS,
  calculateQuestionScore,
  evaluateAnswer,
  sanitizeQuestionForClient,
  extractRevealData,
  QuestionType,
} from './data/quizData';

describe('Giải mã kháng chiến — Client Quiz Engine & Questions Suite', () => {
  // ─── 1. Scoring Semantics ─────────────────────────────────────────────
  describe('calculateQuestionScore', () => {
    it('awards 1250 points for correct answer submitted instantly (25s remaining)', () => {
      const res = calculateQuestionScore(true, 25000, 25000);
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBe(1250);
    });

    it('awards 1125 points for correct answer submitted at mid-point (12.5s remaining)', () => {
      const res = calculateQuestionScore(true, 12500, 25000);
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBe(1125);
    });

    it('awards 1000 base points for correct answer submitted at the last moment (0s remaining)', () => {
      const res = calculateQuestionScore(true, 0, 25000);
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBe(1000);
    });

    it('awards 0 points for any incorrect answer regardless of remaining time', () => {
      const resInstant = calculateQuestionScore(false, 25000, 25000);
      expect(resInstant.isCorrect).toBe(false);
      expect(resInstant.points).toBe(0);

      const resLate = calculateQuestionScore(false, 1000, 25000);
      expect(resLate.isCorrect).toBe(false);
      expect(resLate.points).toBe(0);
    });

    it('clamps remaining time within [0, timeLimitMs]', () => {
      const overTime = calculateQuestionScore(true, 30000, 25000);
      expect(overTime.points).toBe(1250);

      const negativeTime = calculateQuestionScore(true, -5000, 25000);
      expect(negativeTime.points).toBe(1000);
    });
  });

  // ─── 2. Question Answer Evaluation ────────────────────────────────────
  describe('evaluateAnswer', () => {
    it('evaluates choice and photo questions correctly', () => {
      const q1 = QUIZ_QUESTIONS[0]; // choice
      expect(evaluateAnswer(q1, 'b')).toBe(true);
      expect(evaluateAnswer(q1, 'a')).toBe(false);
      expect(evaluateAnswer(q1, '')).toBe(false);
      expect(evaluateAnswer(q1, null)).toBe(false);

      const photoQ = QUIZ_QUESTIONS.find((q) => q.type === 'photo')!;
      expect(evaluateAnswer(photoQ, photoQ.correctOptionId)).toBe(true);
      expect(evaluateAnswer(photoQ, 'wrong_option')).toBe(false);
    });

    it('evaluates button-based ordering questions strictly', () => {
      const orderQ = QUIZ_QUESTIONS.find((q) => q.type === 'order')!;
      const correctOrder = orderQ.correctOrderIds!;

      // Exact correct sequence
      expect(evaluateAnswer(orderQ, correctOrder)).toBe(true);

      // Reversed sequence
      expect(evaluateAnswer(orderQ, [...correctOrder].reverse())).toBe(false);

      // Partial sequence
      expect(evaluateAnswer(orderQ, [correctOrder[0]])).toBe(false);

      // Malformed inputs
      expect(evaluateAnswer(orderQ, 'vk-1')).toBe(false);
      expect(evaluateAnswer(orderQ, null)).toBe(false);
      expect(evaluateAnswer(orderQ, undefined)).toBe(false);
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
        expect(raw.correctOrderIds).toBeUndefined();
        expect(raw.explanation).toBeUndefined();
        expect(raw.sourceNote).toBeUndefined();

        // If order question, items must not expose targetPosition
        if (clientQ.orderItems) {
          for (const item of clientQ.orderItems) {
            expect((item as any).targetPosition).toBeUndefined();
          }
        }
      }
    });

    it('extracts complete reveal data when transitioning to reveal phase', () => {
      for (const q of QUIZ_QUESTIONS) {
        const reveal = extractRevealData(q);
        expect(reveal.questionId).toBe(q.id);
        expect(reveal.explanation.length).toBeGreaterThan(10);
        expect(reveal.sourceNote.length).toBeGreaterThan(5);

        if (q.type === 'choice' || q.type === 'photo') {
          expect(reveal.correctOptionId).toBe(q.correctOptionId);
        } else if (q.type === 'order') {
          expect(reveal.correctOrderIds).toEqual(q.correctOrderIds);
        }
      }
    });
  });

  // ─── 4. Full 10 Questions Content Integrity ───────────────────────────
  describe('10 Sourced History Questions (1946–1950) Content Integrity', () => {
    it('contains exactly 10 questions with IDs 1 to 10', () => {
      expect(QUIZ_QUESTIONS).toHaveLength(10);
      QUIZ_QUESTIONS.forEach((q, idx) => {
        expect(q.id).toBe(idx + 1);
      });
    });

    it('covers choice, accessible timeline order, and authentic photo question types', () => {
      const types = new Set(QUIZ_QUESTIONS.map((q) => q.type));
      expect(types.has('choice')).toBe(true);
      expect(types.has('order')).toBe(true);
      expect(types.has('photo')).toBe(true);
    });

    it('verifies all historical photos use real archive paths and complete metadata', () => {
      const photoQuestions = QUIZ_QUESTIONS.filter((q) => q.type === 'photo');
      expect(photoQuestions.length).toBeGreaterThanOrEqual(2);

      for (const pq of photoQuestions) {
        expect(pq.photo).toBeDefined();
        expect(pq.photo!.src).toContain('images/history/');
        expect(pq.photo!.caption.length).toBeGreaterThan(10);
        expect(pq.photo!.credit.length).toBeGreaterThan(5);
        expect(pq.photo!.date.length).toBeGreaterThan(3);
        expect(pq.photo!.source).toMatch(/^https?:\/\//);
      }
    });

    it('verifies all timeline ordering questions have valid items and sequential targets', () => {
      const orderQuestions = QUIZ_QUESTIONS.filter((q) => q.type === 'order');
      expect(orderQuestions.length).toBeGreaterThanOrEqual(2);

      for (const oq of orderQuestions) {
        expect(oq.orderItems).toBeDefined();
        expect(oq.correctOrderIds).toBeDefined();
        expect(oq.orderItems!.length).toBe(oq.correctOrderIds!.length);

        const itemIds = oq.orderItems!.map((it) => it.id);
        for (const cid of oq.correctOrderIds!) {
          expect(itemIds).toContain(cid);
        }
      }
    });
  });

  // ─── 5. Timeline Reordering Permutations ──────────────────────────────
  describe('Accessible Button-based Reordering Logic', () => {
    it('simulates moveUp and moveDown operations accurately', () => {
      const initial = ['item-A', 'item-B', 'item-C'];

      // Move item at index 1 up -> swaps with index 0
      const moveUp = (arr: string[], idx: number) => {
        if (idx <= 0) return arr;
        const copy = [...arr];
        const temp = copy[idx - 1];
        copy[idx - 1] = copy[idx];
        copy[idx] = temp;
        return copy;
      };

      const moveDown = (arr: string[], idx: number) => {
        if (idx >= arr.length - 1) return arr;
        const copy = [...arr];
        const temp = copy[idx + 1];
        copy[idx + 1] = copy[idx];
        copy[idx] = temp;
        return copy;
      };

      // Moving middle item up
      const afterUp = moveUp(initial, 1);
      expect(afterUp).toEqual(['item-B', 'item-A', 'item-C']);

      // Moving first item up: no-op
      expect(moveUp(afterUp, 0)).toEqual(['item-B', 'item-A', 'item-C']);

      // Moving first item down
      const afterDown = moveDown(afterUp, 0);
      expect(afterDown).toEqual(['item-A', 'item-B', 'item-C']);

      // Moving last item down: no-op
      expect(moveDown(afterDown, 2)).toEqual(['item-A', 'item-B', 'item-C']);
    });
  });
});
