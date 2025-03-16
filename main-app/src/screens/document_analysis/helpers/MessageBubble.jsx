import React from "react"
import ReactMarkdown from "react-markdown"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import { Bot, User } from "lucide-react"
import "katex/dist/katex.min.css"

export const MessageBubble = ({ message }) => {
  const isBot = message.role === "assistant"

  return (
    <div
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"} mb-4`}
    >
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isBot ? "bg-gray-700" : "bg-indigo-600"
        }`}
      >
        <ReactMarkdown
          className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs prose-headings:my-4"
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "")
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold my-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold my-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold my-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-bold my-2">{children}</h4>
            ),
            h5: ({ children }) => (
              <h5 className="text-sm font-bold my-1">{children}</h5>
            ),
            h6: ({ children }) => (
              <h6 className="text-xs font-bold my-1">{children}</h6>
            )
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {!isBot && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  )
}
