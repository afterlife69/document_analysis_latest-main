import React, { useState, useRef, useEffect } from "react"
import { MessageBubble } from "./helpers/MessageBubble"
import { TypewriterEffect } from "./helpers/TypewriterEffect"
import { Send, Square, FileSearch, Info, Home, FolderOpen, ChevronLeft } from "lucide-react"
import axios from "axios"
import { Link } from "react-router-dom"

function Docbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)
  const typewriterRef = useRef(null)

  // Add an initial welcome message when the component mounts
  useEffect(() => {
    const welcomeMessage = {
      id: "welcome",
      content: `# Welcome to Document Assistant! 👋
      
I can help you find information in your personal documents and timetables. Ask me questions like:

- What is my passport number?
- When does my driver's license expire?
- What's my schedule on Monday?
- Show me details from my certificate
      
If you haven't uploaded any documents yet, please visit the Document Vault section to upload them first.`,
      role: "assistant",
      completed: true
    }
    
    setMessages([welcomeMessage])
  }, [])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end"
        })
      }
    })
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      scrollToBottom()
    })

    if (messagesContainerRef.current) {
      observer.observe(messagesContainerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!input.trim() || isTyping || isLoading) return

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      completed: true
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Add temporary loading message
    const loadingMessage = {
      id: "loading-" + Date.now().toString(),
      content: "Searching your documents...",
      role: "assistant",
      completed: true,
      isLoading: true
    }
    
    setMessages(prev => [...prev, loadingMessage])

    try {
      // Send query to backend API
      const response = await axios.post(
        "http://localhost:8080/api/personal/query", 
        { query: input },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading))
      
      // Check if the request was successful
      if (response.data.success) {
        // Create bot message with response
        const botMessage = {
          id: Date.now().toString(),
          content: response.data.message,
          role: "assistant",
          completed: false,
          hasResults: response.data.hasResults
        }

        setMessages(prev => [...prev, botMessage])
        setIsTyping(true)
      } else {
        // Handle error response
        const errorMessage = {
          id: Date.now().toString(),
          content: "Sorry, I encountered an error while processing your question. Please try again.",
          role: "assistant",
          completed: true,
          isError: true
        }
        
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error("Error querying documents:", error)
      
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading))
      
      // Add error message
      const errorMessage = {
        id: Date.now().toString(),
        content: error.response?.data?.message || "Sorry, there was an error processing your request. Please check your connection and try again.",
        role: "assistant",
        completed: true,
        isError: true
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = messageId => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, completed: true } : msg
      )
    )
    setIsTyping(false)
    typewriterRef.current = null
  }

  const handleStop = () => {
    if (typewriterRef.current) {
      // Get the partial content from the stop method
      const partialContent = typewriterRef.current.stop()

      // Update the message with the partial content
      setMessages(prev =>
        prev.map(msg => {
          // Only update the last message
          if (msg.id === prev[prev.length - 1].id) {
            return {
              ...msg,
              content: partialContent, // Use the partial content
              completed: true
            }
          }
          return msg
        })
      )

      setIsTyping(false)
      typewriterRef.current = null
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 text-gray-100">
      <div className="container mx-auto max-w-4xl flex-1 flex flex-col min-h-0">
        <header className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link 
              to="/home" 
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <ChevronLeft className="w-5 h-5" /> 
              <span>Back to Home</span>
            </Link>
            
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSearch className="w-6 h-6 text-indigo-400" /> 
              Document Assistant
            </h1>
            
            <Link 
              to="/docmanage" 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FolderOpen className="w-5 h-5" />
              <span>Manage Documents</span>
            </Link>
          </div>
        </header>

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 hide-scrollbar"
          style={{
            scrollbarWidth: "none" /* Firefox */,
            msOverflowStyle: "none" /* IE and Edge */
          }}
        >
          {/* Hide scrollbar for WebKit browsers */}
          <style jsx>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none; /* Chrome, Safari, Opera */
            }
          `}</style>

          {messages.map(message => 
            message.isLoading ? (
              // Render loading message
              <div key={message.id} className="flex justify-start mb-4">
                <div className="bg-gray-700 rounded-2xl px-4 py-3 max-w-[80%] flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-400 rounded-full border-t-transparent"></div>
                  <p className="text-gray-300">{message.content}</p>
                </div>
              </div>
            ) : message.completed ? (
              // Render completed message
              <MessageBubble key={message.id} message={message} />
            ) : (
              // Render typewriter effect for AI responses
              <TypewriterEffect
                key={message.id}
                message={message}
                onComplete={() => handleComplete(message.id)}
                ref={typewriterRef}
              />
            )
          )}
          
          {/* No documents message */}
          {messages.length === 1 && (
            <div className="flex justify-center my-8">
              <div className="bg-gray-800 rounded-lg p-4 max-w-md flex items-start space-x-3">
                <Info className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-300 text-sm">
                    To get started, upload your documents in the Document Vault section. Then come back here to ask questions about them.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-px" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-gray-700 bg-gray-800 flex-shrink-0"
        >
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your documents..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isTyping || isLoading}
            />
            {isTyping ? (
              <button
                type="button"
                onClick={handleStop}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default Docbot
