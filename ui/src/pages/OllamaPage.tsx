// ui/src/pages/OllamaPage.tsx

import { useState } from "react";
import { OllamaChat } from "@/components/chat/OllamaChat";
import { OllamaChatHistory } from "@/components/chat/OllamaChatHistory";
import { OllamaContextChat } from "@/components/chat/OllamaContextChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OllamaSyncExample } from "@/components/chat/OllamaSyncExample";

export default function OllamaPage() {
    const [activeTab, setActiveTab] = useState("simple");

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8 text-center">
                Ollama Integration
            </h1>

            <Tabs
                defaultValue="simple"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6">
                    <TabsTrigger value="simple">Simple</TabsTrigger>
                    <TabsTrigger value="chat">Chat History</TabsTrigger>
                    <TabsTrigger value="context">Context Chat</TabsTrigger>
                    <TabsTrigger value="sync">Sync API</TabsTrigger>
                </TabsList>

                <TabsContent value="simple">
                    <OllamaChat />
                </TabsContent>

                <TabsContent value="chat">
                    <OllamaChatHistory />
                </TabsContent>

                <TabsContent value="context">
                    <OllamaContextChat />
                </TabsContent>

                <TabsContent value="sync">
                    <OllamaSyncExample />
                </TabsContent>
            </Tabs>
        </div>
    );
}
