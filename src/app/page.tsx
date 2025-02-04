"use client";

import React, { useState, useEffect, useRef } from "react";
import { Container, Paper, Typography, TextField, Button, Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const DIFY_API_URL = "https://api.dify.ai/v1/chat-messages";
const API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || "";

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function sendChatMessage(
  message: string,
  conversationId: string,
  onMessage: (chunk: string) => void
): Promise<void> {
  const response = await fetch(DIFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      inputs: {},
      query: message,
      response_mode: "streaming",
      conversation_id: conversationId,
      user: "abc-123",
    }),
  });

  if (!response.body) {
    throw new Error("レスポンスボディが存在しません");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.substring("data:".length).trim();
        if (!jsonStr) continue;
        try {
          const eventData = JSON.parse(jsonStr);
          if (eventData.event === "message" && eventData.answer) {
            onMessage(eventData.answer);
          }
        } catch (e) {
          console.error("JSONパースエラー:", e);
        }
      }
    }
  }
  if (buffer.length > 0) {
    try {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.substring("data:".length).trim();
        const eventData = JSON.parse(jsonStr);
        if (eventData.event === "message" && eventData.answer) {
          onMessage(eventData.answer);
        }
      }
    } catch (e) {
      console.error("最終JSONパースエラー:", e);
    }
  }
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, streamingMessage]);

  const submitChat = async () => {
    if (!input.trim()) return;
    // ユーザー投稿も ReactMarkdown でレンダリングするためにそのまま記録
    const newHistory = [...history, { role: "user" as const, content: input }];
    setHistory(newHistory);
    setStreamingMessage("");
    const currentInput = input;
    setInput("");
    try {
      let accumulated = "";
      await sendChatMessage(currentInput, "", (chunk: string) => {
        accumulated += chunk;
        setStreamingMessage(accumulated);
      });
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
      setStreamingMessage("");
    } catch (error) {
      console.error("エラー:", error);
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: "エラーが発生しました" },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitChat();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitChat();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>
        薬事法適合チェックツール
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, flexGrow: 1, overflowY: "auto", mb: 2 }}>
        {history.map((msg, index) => (
          <Box key={index} sx={{ mb: 1, textAlign: msg.role === "user" ? "right" : "left" }}>
            <Typography
              variant="body1"
              sx={{
                display: "inline-block",
                p: 1,
                borderRadius: 1,
                bgcolor: msg.role === "user" ? "primary.light" : "grey.300",
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {msg.content}
              </ReactMarkdown>
            </Typography>
          </Box>
        ))}
        {streamingMessage && (
          <Box sx={{ mb: 1, textAlign: "left" }}>
            <Typography
              variant="body1"
              sx={{
                display: "inline-block",
                p: 1,
                borderRadius: 1,
                bgcolor: "grey.300",
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {streamingMessage}
              </ReactMarkdown>
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", gap: 1 }}
        onKeyDown={handleKeyDown}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="メッセージを入力してください"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          multiline
          minRows={3}
        />
        <Button variant="contained" type="submit">
          送信
        </Button>
      </Box>
    </Container>
  );
}
