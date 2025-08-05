
import { ChatContainer } from "@/components/chat/chat-container";
import { EnvChecker } from "@/components/debug/env-checker";
import { StepByStepFix } from "@/components/debug/step-by-step-fix";

export default function Home() {
  return (
    <main className="h-screen overflow-hidden">
      <ChatContainer />
      <EnvChecker />
      <StepByStepFix />
    </main>
  );
}
