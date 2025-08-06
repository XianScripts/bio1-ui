import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { FileUp, Send, Sparkles } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function ChatApp() {
  /* ---------------- state ---------------- */
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi there! How can I help you today?",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  /* ------------- auto‑scroll ------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ------------- helpers ------------- */
  const sendQuery = async () => {
  const q = input.trim();
  if (!q) return;
  setInput("");
  setMessages((m) => [...m, { role: "user", text: q }]);

  try {
    const form = new FormData();
    form.append("message", q);
    const res = await fetch(`${API_BASE}/chat`, { method: "POST", body: form });

    if (!res.ok) {
      const text = await res.text(); // try to get text to debug
      console.error("Non-OK response from backend:", text);
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Response JSON:", data);

    if (!data.answer) {
      throw new Error("Missing 'answer' in response");
    }

    setMessages((m) => [...m, { role: "bot", text: data.answer, sources: data.sources || [] }]);
  } catch (e) {
    console.error("Fetch error:", e);
    setMessages((m) => [...m, { role: "bot", text: "⚠️ Server error.", sources: [] }]);
  }
};

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      alert(`${file.name} indexed!`);
    } catch {
      alert("Upload failed");
    }
  };

  /* ------------- message bubble ------------- */
  const Bubble = ({ role, text, sources }) => (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"} mb-3`}>
      <Card className={`max-w-[80%] rounded-2xl shadow ${role === "user" ? "bg-blue-600 text-white" : "bg-white"}`}>
        <CardContent className="p-4 text-sm whitespace-pre-wrap">
          {text}
          {sources?.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="ml-1 text-xs underline">[sources]</button>
              </PopoverTrigger>
              <PopoverContent className="w-64 text-xs" align="start">
                {sources.join(", ")}
              </PopoverContent>
            </Popover>
          )}
        </CardContent>
      </Card>
    </div>
  );

  /* ---------------- render ---------------- */
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-sky-50 to-emerald-50">
      {/* Header */}
      <header className="w-full py-3 px-4 shadow bg-white flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="w-5 h-5 text-emerald-600" /> Bio 1 Tutor
      </header>

      {/* Chat area */}
      <ScrollArea className="flex-1 px-4 py-6">
        {messages.map((m, i) => (
          <Bubble key={i} {...m} />
        ))}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input bar */}
      <div className="w-full px-4 py-3 bg-white shadow-inner flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a biology question…"
          onKeyDown={(e) => e.key === "Enter" && sendQuery()}
        />
        <input type="file" hidden ref={fileRef} onChange={handleUpload} />
        <Button variant="outline" onClick={() => fileRef.current.click()}>
          <FileUp className="w-4 h-4" />
        </Button>
        <Button onClick={sendQuery}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

