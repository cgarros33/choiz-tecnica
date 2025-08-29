"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Stethoscope, Search, Plus, FileText, LogOut} from "lucide-react"
import { NavigationDropdown } from "@/components/navigation-dropdown"

interface PreguntaMedica {
  pregunta: string
  value: string
}

interface PatientHistory {
  nombre: string
  preguntas_medicas: PreguntaMedica[]
}

interface HistoryResponse {
  results: PatientHistory[]
}

interface Usuario {
  nombre: string
  apellido: string
  email: string
  rol: "USER" | "ADMIN" | "DOCTOR"
}

export default function HistoryPage() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [historyData, setHistoryData] = useState<PatientHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Search filters
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [doctorName, setDoctorName] = useState("")

  // New history form
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [newHistoryEntries, setNewHistoryEntries] = useState<PreguntaMedica[]>([])

  useEffect(() => {
    const usuario = localStorage.getItem("user")
    if (usuario) {
      setCurrentUser(JSON.parse(usuario))
      fetchHistory()
    } else{
        window.location.href = "/login"
    }
  }, [])

  const fetchHistory = async (searchParams?: Record<string, string>) => {
    setLoading(true)
    try {
      const jwt = localStorage.getItem("jwt")
      if (!jwt) return

      const params = new URLSearchParams()
      if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value) params.append(key, value)
        })
      }

      const response = await fetch(`/api/history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data: HistoryResponse = await response.json()
        setHistoryData(data.results)
      }
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    const searchParams: Record<string, string> = {}
    if (userId) searchParams["user-id"] = userId
    if (userName) searchParams["user-name"] = userName
    if (doctorId) searchParams["doctor-id"] = doctorId
    if (doctorName) searchParams["doctor-name"] = doctorName

    fetchHistory(searchParams)
  }

  const addNewEntry = () => {
    if (newQuestion.trim() && newAnswer.trim()) {
      setNewHistoryEntries([...newHistoryEntries, { pregunta: newQuestion, value: newAnswer }])
      setNewQuestion("")
      setNewAnswer("")
    }
  }

  const removeEntry = (index: number) => {
    setNewHistoryEntries(newHistoryEntries.filter((_, i) => i !== index))
  }

  const handleLogout = () => {
    localStorage.removeItem("jwt")
    localStorage.removeItem("user")
    setCurrentUser(null)
  }

  const submitNewHistory = async () => {
    if (newHistoryEntries.length === 0) return

    try {
      const jwt = localStorage.getItem("jwt")
      if (!jwt) return

      const response = await fetch("/api/history", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preguntas_medicas: newHistoryEntries }),
      })

      if (response.ok) {
        setNewHistoryEntries([])
        setShowCreateForm(false)
        fetchHistory() // Refresh the history
      }
    } catch (error) {
      console.error("Error creating history:", error)
    }
  }

  const canSearchUsers = currentUser?.rol === "ADMIN" || currentUser?.rol === "DOCTOR"
  const canSearchDoctors = currentUser?.rol === "ADMIN"
  const canCreateHistory = currentUser?.rol === "USER"

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            
                <NavigationDropdown currentPage="history" />
          </div>
          {canCreateHistory && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="ml-auto items-center gap-2">
              <Plus className="h-4 w-4" />
              New History
            </Button>
          )}
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Create New History Form */}
        {canCreateHistory && showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Medical History
              </CardTitle>
              <CardDescription>Add new medical questions and answers to your history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question">Medical Question</Label>
                  <Textarea
                    id="question"
                    placeholder="e.g., Have you had fever in the last 7 days?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea
                    id="answer"
                    placeholder="e.g., No"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addNewEntry} variant="outline">
                  Add Entry
                </Button>
              </div>

              {/* New Entries Preview */}
              {newHistoryEntries.length > 0 && (
                <div className="space-y-2">
                  <Label>New Entries ({newHistoryEntries.length})</Label>
                  {newHistoryEntries.map((entry, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{entry.pregunta}</p>
                        <p className="text-muted-foreground text-sm">{entry.value || "No answer"}</p>
                      </div>
                      <Button
                        onClick={() => removeEntry(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={submitNewHistory}>Save History</Button>
                    <Button onClick={() => setShowCreateForm(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search Filters */}
        {canSearchUsers && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Medical History
              </CardTitle>
              <CardDescription>Filter medical records by user and doctor information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="user-id">User ID</Label>
                  <Input
                    id="user-id"
                    placeholder="Search by user ID..."
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="user-name">User Name</Label>
                  <Input
                    id="user-name"
                    placeholder="Search by user name..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                {canSearchDoctors && (
                  <>
                    <div>
                      <Label htmlFor="doctor-id">Doctor ID</Label>
                      <Input
                        id="doctor-id"
                        placeholder="Search by doctor ID..."
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="doctor-name">Doctor Name</Label>
                      <Input
                        id="doctor-name"
                        placeholder="Search by doctor name..."
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medical History Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Medical History ({historyData.reduce((total, patient) => total + patient.preguntas_medicas.length, 0)}{" "}
              entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading medical history...</p>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No medical history found</p>
                {canCreateHistory && (
                  <Button onClick={() => setShowCreateForm(true)} className="mt-4" variant="outline">
                    Create Your First Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {historyData.map((patient, patientIndex) => (
                  <div key={patientIndex} className="border border-border rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full">
                        <Stethoscope className="h-4 w-4 text-primary" />
                      </div>
                      Patient: {patient.nombre}
                    </h2>
                    <div className="space-y-3">
                      {patient.preguntas_medicas.map((entry, entryIndex) => (
                        <div key={entryIndex} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground mb-1">{entry.pregunta}</h3>
                              <p className="text-muted-foreground text-sm">
                                {entry.value || <span className="italic">No answer provided</span>}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">#{entryIndex + 1}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
