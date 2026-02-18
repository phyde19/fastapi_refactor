"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatScreen } from "@/features/chat/ChatScreen";
import { useChatStream } from "@/hooks/useChatStream";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { loadConversationById } = useChatStream();

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    void loadConversationById(conversationId);
  }, [conversationId, loadConversationById]);

  return <ChatScreen />;
}
