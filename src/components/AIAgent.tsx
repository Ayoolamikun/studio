
"use client";

import { useState, useRef, useEffect, useActionState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Bot, User, Send, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { chat } from "@/ai/flows/chat-flow";
import { useFormStatus } from 'react-dom';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending}>
      {pending ? <Loader className="animate-spin" /> : <Send />}
    </Button>
  );
}

export default function AIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(prevState: any, formData: FormData) {
    const userInput = formData.get("message") as string;
    if (!userInput.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: userInput }]);
    
    // Optimistic UI for bot typing
    setMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

    const botResponse = await chat(userInput);
    
    // Replace typing indicator with actual response
    setMessages(prev => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;
        if(newMessages[lastMessageIndex].role === 'assistant' && newMessages[lastMessageIndex].content === '...') {
            newMessages[lastMessageIndex] = { role: 'assistant', content: botResponse };
        } else {
             newMessages.push({ role: 'assistant', content: botResponse });
        }
        return newMessages;
    });

    return null; // No state to return for this simple case
  }

  const [state, formAction] = useActionState(handleAction, null);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
        setMessages([{ role: 'assistant', content: "Hello! How can I help you learn about Corporate Magnate's services today?" }]);
        inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          size="icon"
          className="rounded-full w-16 h-16 shadow-2xl transition-transform hover:scale-110 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
        </Button>
      </div>
      
      <div className={cn(
          "fixed bottom-24 left-6 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <Card className="w-[350px] h-[500px] shadow-2xl flex flex-col">
          <CardHeader className='flex-row items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Bot className="h-6 w-6 text-primary" />
              <CardTitle className='font-headline text-xl'>AI Assistant</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === 'assistant' && (
                        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                            <Bot size={20} />
                        </span>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 max-w-[80%]",
                          message.role === 'user'
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {message.content === '...' ? (
                           <div className="flex items-center gap-2">
                               <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                               <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                               <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span>
                           </div>
                        ) : (
                           <p className='text-sm'>{message.content}</p>
                        )}
                      </div>
                       {message.role === 'user' && (
                         <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
                            <User size={20} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form
              ref={formRef}
              action={(formData) => {
                formAction(formData);
                formRef.current?.reset();
              }}
              className="flex w-full gap-2"
            >
              <Input name="message" placeholder="Ask a question..." autoComplete="off" ref={inputRef} />
              <SubmitButton />
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
