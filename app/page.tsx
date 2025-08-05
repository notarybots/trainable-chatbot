
import { ChatContainer } from "@/components/chat/chat-container";
import { EnvChecker } from "@/components/debug/env-checker";

export default function Home() {
  return (
    <main className="h-screen overflow-hidden">
      <ChatContainer />
      <EnvChecker />
    </main>
  );
}
