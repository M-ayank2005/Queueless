"use client"
import React, { useEffect } from "react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[QueueLess Global Root Error]", error)
  }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backgroundColor: "#09090b",
        color: "#f4f4f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1.5rem"
      }}>
        <div style={{
          maxWidth: "28rem",
          width: "100%",
          textAlign: "center",
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
        }}>
          <div style={{
            width: "3rem",
            height: "3rem",
            margin: "0 auto 1.25rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            fontSize: "1.5rem",
            fontWeight: "bold"
          }}>
            !
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Application Error
          </h1>

          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
            An unexpected error occurred while loading QueueLess. Please try refreshing the application.
          </p>

          {error?.digest && (
            <p style={{
              fontSize: "0.75rem",
              color: "#71717a",
              fontFamily: "monospace",
              margin: "0 0 1.5rem",
              wordBreak: "break-all"
            }}>
              Reference: {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.625rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.15s ease"
              }}
            >
              Try Again
            </button>

            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.href = "/"
              }}
              style={{
                backgroundColor: "#27272a",
                color: "#f4f4f5",
                border: "1px solid #3f3f46",
                borderRadius: "0.5rem",
                padding: "0.625rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
