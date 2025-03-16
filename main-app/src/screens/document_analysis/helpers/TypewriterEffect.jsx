import React, {
    useState,
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle
  } from "react"
  import { MessageBubble } from "./MessageBubble"
  
  export const TypewriterEffect = forwardRef(({ message, onComplete }, ref) => {
    const [displayedContent, setDisplayedContent] = useState("")
    const [currentIndex, setCurrentIndex] = useState(0)
    const animationFrameRef = useRef()
    const isStopped = useRef(false)
    const lastUpdateTime = useRef(Date.now())
    const messageEndRef = useRef(null)
    const chunkSize = 5 // Characters per chunk
    const frameDelay = 1000 / 60 // Target 60fps
  
    // Scroll to the latest content
    const scrollToNewContent = () => {
      if (messageEndRef.current) {
        requestAnimationFrame(() => {
          messageEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end"
          })
        })
      }
    }
  
    useImperativeHandle(ref, () => ({
      stop: () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        isStopped.current = true
        // Return the current partial content
        return displayedContent
      }
    }))
  
    useEffect(() => {
      const updateText = () => {
        const now = Date.now()
        const deltaTime = now - lastUpdateTime.current
  
        if (deltaTime >= frameDelay) {
          if (currentIndex < message.content.length && !isStopped.current) {
            const nextIndex = Math.min(
              currentIndex + chunkSize,
              message.content.length
            )
            setDisplayedContent(message.content.slice(0, nextIndex))
            setCurrentIndex(nextIndex)
            lastUpdateTime.current = now
  
            // Scroll to show the latest content
            scrollToNewContent()
          } else if (currentIndex >= message.content.length) {
            onComplete()
            return
          }
        }
  
        if (!isStopped.current) {
          animationFrameRef.current = requestAnimationFrame(updateText)
        }
      }
  
      animationFrameRef.current = requestAnimationFrame(updateText)
  
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }, [currentIndex, message.content, onComplete])
  
    return (
      <div className="typewriter-container">
        <MessageBubble
          message={{
            ...message,
            content: displayedContent || " "
          }}
        />
        <div ref={messageEndRef} className="h-0" />
      </div>
    )
  })
  