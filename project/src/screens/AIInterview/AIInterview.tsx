import React, { useState, useEffect, useRef } from "react";
import { NavigationSection } from "../Dashboard/sections/NavigationSection";
import { Button } from "../../components/ui/button";
import {
  SendIcon,
  RefreshCw,
  AlertCircleIcon,
  CheckCircle2
} from "lucide-react";
import { Textarea } from "../../components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import {
  sendMessageToGemini,
  saveInterviewLog,
  getLatestInterviewSession,
  clearInterviewSession,
  ChatMessage
} from "../../lib/geminiService";
import {
  extractProfileFromConversation,
  saveProfileToSupabase
} from "../../lib/profileExtractor";

// Initial message from the career agent
const INITIAL_MESSAGE = "Bonjour ! Je suis votre agent de carrière IA, et je suis là pour vous aider à construire un profil professionnel complet. Je vous poserai une série de questions pour comprendre votre parcours, vos compétences et vos aspirations professionnelles. Commençons par votre nom - comment dois-je vous appeler ?";

const initialMessages = [
  {
    sender: "ai" as const,
    content: INITIAL_MESSAGE
  }
];

export const AIInterview = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState(initialMessages);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([
    { role: 'assistant', content: INITIAL_MESSAGE }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [interviewProgress, setInterviewProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load previous session on mount
  useEffect(() => {
    const loadPreviousSession = async () => {
      if (!user) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const previousSession = await getLatestInterviewSession(user.id);

        if (previousSession && previousSession.messages.length > 0) {
          // Restore the session
          setSessionId(previousSession.sessionId);
          setConversationHistory(previousSession.messages);

          // Convert to display messages
          const displayMessages = previousSession.messages.map(msg => ({
            sender: msg.role === 'assistant' ? 'ai' as const : 'user' as const,
            content: msg.content
          }));
          setMessages(displayMessages);

          // Check if the interview was already completed
          const lastMessage = previousSession.messages[previousSession.messages.length - 1];
          const wasCompleted = lastMessage.role === 'assistant' &&
            (lastMessage.content.includes("j'ai toutes les informations") ||
             lastMessage.content.includes("Merci d'avoir complété"));

          if (wasCompleted) {
            setIsComplete(true);
            setInterviewProgress(100);
          } else {
            // Calculate progress based on restored messages
            const userMessageCount = previousSession.messages.filter(m => m.role === 'user').length;
            setInterviewProgress(calculateProgress(userMessageCount, false));
          }
        }
      } catch (err) {
        console.error('Error loading previous session:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadPreviousSession();
  }, [user]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep focus on input after each message
  useEffect(() => {
    if (!isTyping && !isComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping, isComplete, messages]);

  // Calculate dynamic progress based on conversation depth and quality
  const calculateProgress = (conversationLength: number, isCompleted: boolean) => {
    if (isCompleted) return 100;
    
    // Base progress calculation
    // We expect around 8-12 meaningful exchanges for a complete profile
    const expectedExchanges = 10;
    const baseProgress = Math.min((conversationLength / expectedExchanges) * 85, 85);
    
    // Add bonus progress for longer, more detailed responses
    const userMessages = messages.filter(msg => msg.sender === "user");
    const avgResponseLength = userMessages.reduce((acc, msg) => acc + msg.content.length, 0) / Math.max(userMessages.length, 1);
    
    // Bonus for detailed responses (50+ characters average)
    const detailBonus = avgResponseLength > 50 ? Math.min((avgResponseLength - 50) / 20, 10) : 0;
    
    return Math.min(Math.round(baseProgress + detailBonus), 90);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isComplete || !user) return;

    const userMessageText = inputText.trim();

    // Clear any previous errors
    setError(null);

    // Add user message to display
    const newUserMessage = { sender: "user" as const, content: userMessageText };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputText("");

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Update conversation history for Gemini
    const updatedHistory: ChatMessage[] = [...conversationHistory, { role: 'user', content: userMessageText }];
    setConversationHistory(updatedHistory);

    // Calculate and update progress immediately
    const newProgress = calculateProgress(updatedMessages.filter(msg => msg.sender === "user").length, false);
    setInterviewProgress(newProgress);

    // Show typing indicator
    setIsTyping(true);

    try {
      // Save user message to database
      await saveInterviewLog(user.id, 'user', userMessageText, sessionId);

      // Call Gemini API with the conversation history (without the current message, as it's passed separately)
      console.log('Sending to Gemini with history:', conversationHistory);
      console.log('User message:', userMessageText);
      const aiResponse = await sendMessageToGemini(conversationHistory, userMessageText);
      console.log('Gemini response:', aiResponse);

      // Check if the AI has completed the interview
      const isInterviewComplete = aiResponse.includes("[INTERVIEW_COMPLETE]");

      // Clean the response for display
      let displayContent = aiResponse.replace("[INTERVIEW_COMPLETE]", "").trim();

      if (isInterviewComplete) {
        setIsComplete(true);
        setInterviewProgress(100);

        // Add completion message
        displayContent += "\n\nMerci d'avoir complété l'entretien de profil ! J'ai recueilli des informations complètes sur votre parcours professionnel et vos objectifs de carrière.";
      } else {
        // Recalculate progress
        const finalProgress = calculateProgress(updatedMessages.filter(msg => msg.sender === "user").length, false);
        setInterviewProgress(finalProgress);
      }

      // Save AI response to database
      await saveInterviewLog(user.id, 'assistant', displayContent, sessionId);

      // Update conversation history
      setConversationHistory([...updatedHistory, { role: 'assistant', content: displayContent }]);

      // Add AI response to display
      setMessages(prev => [...prev, { sender: "ai" as const, content: displayContent }]);

      setIsTyping(false);

    } catch (err) {
      console.error("Error in interview process:", err);
      setError("J'ai des difficultés de connexion en ce moment. Veuillez réessayer.");
      setMessages(prev => [...prev, {
        sender: "ai",
        content: "Je suis désolé, j'ai des difficultés de connexion en ce moment. Veuillez réessayer plus tard."
      }]);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set height to scrollHeight, with min and max limits
    const newHeight = Math.min(Math.max(e.target.scrollHeight, 56), 200);
    e.target.style.height = `${newHeight}px`;
  };

  const handleClearChat = async () => {
    // Clear from database
    if (user) {
      try {
        await clearInterviewSession(user.id, sessionId);
      } catch (err) {
        console.error('Error clearing session from database:', err);
      }
    }

    // Reset state with new session
    setSessionId(crypto.randomUUID());
    setMessages(initialMessages);
    setConversationHistory([{ role: 'assistant', content: INITIAL_MESSAGE }]);
    setIsComplete(false);
    setProfileSaved(false);
    setInterviewProgress(0);
    setError(null);
    setShowResetModal(false);
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const handleCancelReset = () => {
    setShowResetModal(false);
  };

  // Save extracted profile when interview is complete
  const handleSaveProfile = async () => {
    if (!user || profileSaved) return;

    setIsSavingProfile(true);
    setError(null);

    try {
      // Extract profile data from conversation
      const extractedProfile = await extractProfileFromConversation(conversationHistory);

      // Save to Supabase
      await saveProfileToSupabase(user.id, extractedProfile);

      setProfileSaved(true);

      // Navigate to profile page after a short delay
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError("Erreur lors de la sauvegarde du profil. Veuillez réessayer.");
    } finally {
      setIsSavingProfile(false);
    }
  };
  
  return (
    <main className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 overflow-hidden">
      <aside className="h-full w-60 flex-shrink-0">
        <NavigationSection />
      </aside>
      
      <div className="flex-1 flex flex-col h-full">
        {/* Enhanced Header with Full Width */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
          <div className="w-full px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent tracking-tight">
                  Entretien de Carrière IA
                </h1>
                <p className="text-slate-600 font-medium">
                  Laissez notre agent de carrière IA vous aider à créer un profil professionnel complet
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetClick}
                className="gap-2 bg-white/60 backdrop-blur-sm border-white/30 hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </Button>
            </div>

            {/* Enhanced Error Display - Full Width */}
            {error && (
              <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-2xl flex items-center gap-3 shadow-sm animate-slideIn">
                <AlertCircleIcon className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-medium">{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-auto bg-white/60 border-red-200 text-red-600 hover:bg-red-50"
                >
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Chat Area - Full Width */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full w-full flex flex-col">
            {/* Messages Container with Full Width */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Chargement de votre session précédente...</span>
                  </div>
                </div>
              ) : messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex animate-fadeIn ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {message.sender === 'ai' && (
                    <div className="flex-shrink-0 mr-4">
                      <img
                        src="/logo.png"
                        alt="AI"
                        className="w-12 h-12 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/48x48/white/blue?text=AI";
                        }}
                      />
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                    <div className={`p-5 rounded-3xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-tr-lg shadow-blue-200/50' 
                        : 'bg-white/90 text-slate-800 rounded-tl-lg border border-white/40 shadow-slate-200/50'
                    }`}>
                      <p className="leading-relaxed text-base font-medium">{message.content}</p>
                    </div>
                    <div className={`text-xs text-slate-400 mt-2 font-medium ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {message.sender === 'user' ? 'Vous' : 'Agent de Carrière IA'}
                    </div>
                  </div>
                  
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 ml-4 order-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-slate-200">
                        U
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Enhanced Typing indicator */}
              {isTyping && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex-shrink-0 mr-4">
                    <img
                      src="/logo.png"
                      alt="AI"
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/48x48/white/blue?text=AI";
                      }}
                    />
                  </div>
                  
                  <div className="p-5 bg-white/90 backdrop-blur-sm text-slate-800 rounded-3xl rounded-tl-lg border border-white/40 shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef}></div>
            </div>

            {/* Enhanced Input Area - Full Width */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-t border-white/20 px-8 py-8">
              {isComplete ? (
                <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200/60 p-8 rounded-3xl shadow-lg backdrop-blur-sm w-full">
                  <div className="flex items-start gap-6">
                    <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-emerald-100">
                      {profileSaved ? (
                        <CheckCircle2 className="w-7 h-7 text-white" />
                      ) : (
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-emerald-800 text-xl mb-3 tracking-tight">
                        {profileSaved ? "Profil Sauvegardé !" : "Entretien Terminé !"}
                      </h3>
                      <p className="text-emerald-700 font-medium leading-relaxed mb-4">
                        {profileSaved
                          ? "Votre profil a été sauvegardé avec succès. Redirection vers votre profil..."
                          : "Vous avez terminé avec succès l'entretien de profil. Cliquez sur le bouton ci-dessous pour sauvegarder vos informations."}
                      </p>
                      {!profileSaved && (
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                          {isSavingProfile ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Sauvegarde en cours...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Sauvegarder mon profil
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 w-full items-end">
                  <Textarea
                    ref={inputRef}
                    className="flex-1 min-h-[56px] max-h-[200px] rounded-3xl bg-white/90 backdrop-blur-sm border-white/40 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 px-6 py-4 text-base placeholder:text-slate-400 shadow-lg font-medium transition-all duration-300 resize-none overflow-hidden"
                    placeholder="Tapez votre réponse ici..."
                    value={inputText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    autoFocus
                    rows={1}
                  />
                  <Button
                    className="h-14 w-14 rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 ring-2 ring-blue-100 hover:ring-blue-200 flex-shrink-0"
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping}
                  >
                    <SendIcon className="w-6 h-6 text-white" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Custom Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md mx-4 shadow-2xl border border-white/40 animate-slideIn">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shadow-sm">
                <AlertCircleIcon className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Réinitialiser l'Entretien</h3>
                <p className="text-slate-600 text-sm font-medium">Cette action ne peut pas être annulée</p>
              </div>
            </div>
            
            <p className="text-slate-700 mb-8 leading-relaxed font-medium">
              Êtes-vous sûr de vouloir réinitialiser l'entretien ? Tous vos progrès et réponses seront perdus.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelReset}
                className="px-8 h-12 rounded-2xl bg-white/60 border-slate-200 hover:bg-slate-50 font-semibold transition-all duration-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleClearChat}
                className="px-8 h-12 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Réinitialiser l'Entretien
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};