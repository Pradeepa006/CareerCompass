import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { MessageCircleMore, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const starters = ["What should I learn next?", "Explain my highest-priority skill gap.", "How does my roadmap work?"];

export default function CareerAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const assistant = trpc.assistant.respond.useMutation({ onSuccess: result => setMessages(current => [...current, { role: "assistant", content: result.content }]), onError: error => toast.error(error.message) });
  function send(content: string) { const userMessage: Message = { role: "user", content }; setMessages(current => { const next = [...current, userMessage]; assistant.mutate({ messages: next.filter((message): message is { role: "user" | "assistant"; content: string } => message.role !== "system").slice(-8) }); return next; }); }
  return <Sheet><SheetTrigger asChild><Button className="button-press fixed bottom-5 right-5 z-40 h-12 rounded-full bg-[#17233c] px-4 shadow-lg shadow-slate-900/20" aria-label="Open CareerCompass AI assistant"><Sparkles size={17} /><span className="ml-2 hidden sm:inline">CareerCompass AI</span></Button></SheetTrigger><SheetContent className="w-full border-l border-slate-200 bg-[#f7f9fc] p-0 sm:max-w-[480px]"><SheetHeader className="border-b border-slate-200 bg-white px-5 py-5 text-left"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17233c] text-white"><MessageCircleMore size={18} /></span><div><SheetTitle className="display text-xl font-extrabold">CareerCompass AI</SheetTitle><p className="mt-1 text-xs leading-5 text-slate-500">Contextual guidance from your profile, target, roadmap and curated indicators.</p></div></div></SheetHeader><div className="h-[calc(100vh-100px)] p-4"><AIChatBox messages={messages} onSendMessage={send} isLoading={assistant.isPending} height="100%" placeholder="Ask about your next career step…" emptyStateMessage="Ask a question about your current career journey." suggestedPrompts={starters} className="rounded-[1.5rem] border-slate-200 shadow-none" /></div></SheetContent></Sheet>;
}
