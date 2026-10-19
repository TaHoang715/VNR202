import { useEffect, useState, useRef, useMemo } from 'react';
import { ConvexClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import { getConvexUrl, generateSecureToken } from './socket';
import type { QuizSubscribeEnvelope, QuizLeaderboardEntry } from '../../convex/quiz';
import type { ClientQuizQuestion, QuizRevealData } from './data/quizData';

export type { QuizSubscribeEnvelope, QuizLeaderboardEntry, ClientQuizQuestion, QuizRevealData };

let sharedConvexClient: ConvexClient | null = null;

export function getQuizConvexClient(): ConvexClient | null {
  const url = getConvexUrl();
  if (!url) return null;
  if (!sharedConvexClient) {
    sharedConvexClient = new ConvexClient(url);
  }
  return sharedConvexClient;
}

export function isQuizConvexAvailable(): boolean {
  return Boolean(getConvexUrl());
}

export async function createOnlineQuizRoom(args: {
  hostToken: string;
  connectionId?: string;
  classSize?: number | null;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình (thiếu VITE_CONVEX_URL)');

  return client.mutation(anyApi.quiz.command, {
    event: 'room:create',
    payload: {
      hostToken: args.hostToken,
      connectionId: args.connectionId || 'conn_host',
      classSize: args.classSize,
    },
  });
}

export async function joinOnlineQuizRoom(args: {
  roomCode: string;
  nickname: string;
  playerToken: string;
  connectionId?: string;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình (thiếu VITE_CONVEX_URL)');

  return client.mutation(anyApi.quiz.command, {
    event: 'room:join',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      nickname: args.nickname.trim(),
      playerToken: args.playerToken,
      connectionId: args.connectionId || 'conn_p',
    },
  });
}

export async function startOnlineQuiz(args: {
  roomCode: string;
  hostToken: string;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'quiz:start',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      hostToken: args.hostToken,
    },
  });
}

export async function submitOnlineQuizAnswer(args: {
  roomCode: string;
  epoch: number;
  playerToken: string;
  questionIndex: number;
  answer: unknown;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'quiz:answer',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      epoch: args.epoch,
      playerToken: args.playerToken,
      questionIndex: args.questionIndex,
      answer: args.answer,
    },
  });
}

export async function advanceOnlineQuiz(args: {
  roomCode: string;
  hostToken: string;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'quiz:advance',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      hostToken: args.hostToken,
    },
  });
}

export async function replayOnlineQuiz(args: {
  roomCode: string;
  hostToken: string;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'quiz:replay',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      hostToken: args.hostToken,
    },
  });
}

export async function closeOnlineQuizRoom(args: {
  roomCode: string;
  hostToken: string;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'room:close',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      hostToken: args.hostToken,
    },
  });
}

export async function sendOnlineQuizHeartbeat(args: {
  roomCode: string;
  token: string;
  isHost: boolean;
  connectionId?: string;
}) {
  const client = getQuizConvexClient();
  if (!client) return { ok: false };

  return client.mutation(anyApi.quiz.command, {
    event: 'presence:heartbeat',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      token: args.token,
      isHost: args.isHost,
      connectionId: args.connectionId || 'conn_hb',
    },
  });
}

export async function createOnlineQuizPoll(args: {
  roomCode: string;
  hostToken: string;
  question: string;
  options: string[];
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'poll:create',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      hostToken: args.hostToken,
      question: args.question,
      options: args.options,
    },
  });
}

export async function voteOnlineQuizPoll(args: {
  roomCode: string;
  playerToken: string;
  pollId: string;
  optionIndex: number;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'poll:vote',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      playerToken: args.playerToken,
      pollId: args.pollId,
      optionIndex: args.optionIndex,
    },
  });
}

export async function closeOnlineQuizPoll(args: {
  roomCode: string;
  hostToken: string;
  pollId: string;
}) {
  const client = getQuizConvexClient();
  if (!client) throw new Error('Máy chủ Convex trực tuyến chưa được cấu hình');

  return client.mutation(anyApi.quiz.command, {
    event: 'poll:close',
    payload: {
      roomCode: args.roomCode.trim().toUpperCase(),
      hostToken: args.hostToken,
      pollId: args.pollId,
    },
  });
}

/**
 * Custom React hook subscribing to a Quiz Room in Convex
 */
export function useQuizSubscription(
  roomCode: string | null,
  token: string | null,
  isHost: boolean = false
) {
  const [data, setData] = useState<QuizSubscribeEnvelope | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const connectionId = useMemo(() => {
    try {
      return generateSecureToken(16);
    } catch {
      return 'conn_' + Math.random().toString(36).substring(2, 10);
    }
  }, []);

  useEffect(() => {
    if (!roomCode || !token) {
      setData(null);
      setLoading(false);
      return;
    }

    const client = getQuizConvexClient();
    if (!client) {
      setError('Chưa thiết lập biến kết nối VITE_CONVEX_URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Initial subscription
    const unsubscribe = client.onUpdate(
      anyApi.quiz.subscribe,
      {
        roomCode: roomCode.trim().toUpperCase(),
        token: token.trim(),
        connectionId,
      },
      (envelope) => {
        setData(envelope);
        setLoading(false);
      },
      (err) => {
        console.error('Quiz subscription error:', err);
        setError('Lỗi kết nối máy chủ phòng chơi: ' + (err.message || String(err)));
        setLoading(false);
      }
    );

    // Heartbeat every 15s
    const heartbeatTimer = setInterval(() => {
      sendOnlineQuizHeartbeat({
        roomCode,
        token,
        isHost,
        connectionId,
      }).catch((e) => console.warn('Heartbeat error:', e));
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(heartbeatTimer);
    };
  }, [roomCode, token, isHost, connectionId]);

  return { data, loading, error };
}
