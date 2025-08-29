"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Home, FileText } from "lucide-react"

export function NavigationDropdown({ currentPage }: { currentPage: "dashboard" | "history" }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const navigate = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
      >
        <span className="font-medium">{currentPage === "dashboard" ? "Medical Dashboard" : "Medical History"}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <button
            onClick={() => navigate("/")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
              currentPage === "dashboard" ? "bg-cyan-50 text-cyan-700" : "text-gray-700"
            }`}
          >
            <Home className="h-4 w-4" />
            Medical Dashboard
          </button>
          <button
            onClick={() => navigate("/history")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
              currentPage === "history" ? "bg-cyan-50 text-cyan-700" : "text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            Medical History
          </button>
        </div>
      )}
    </div>
  )
}
