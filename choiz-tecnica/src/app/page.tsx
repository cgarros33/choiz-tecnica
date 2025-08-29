"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stethoscope, Search, LogOut, User, Users } from "lucide-react"

interface Usuario {
  nombre: string
  apellido: string
  email: string
  rol: "USER" | "ADMIN" | "DOCTOR"
}

interface ApiResponse {
  usuarios: Usuario[]
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [doctorName, setDoctorName] = useState("")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const jwt = localStorage.getItem("jwt")
    const usuario = localStorage.getItem("user")

    console.log("Checked authentication:", { jwt, usuario })

    console.log(usuario)

    if (jwt && usuario) {
      setIsAuthenticated(true)
      setCurrentUser(JSON.parse(usuario))
      fetchUsers()
    }
  }, [])

  const fetchUsers = async (doctorNameParam?: string, userNameParam?: string) => {
    setLoading(true)
    try {
      const jwt = localStorage.getItem("jwt")
      if (!jwt) return

      const params = new URLSearchParams()
      if (doctorNameParam) params.append("doctor-name", doctorNameParam)
      if (userNameParam) params.append("user-name", userNameParam)

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data: ApiResponse = await response.json()
        setUsuarios(data.usuarios)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchUsers(doctorName, userName)
  }

  const handleLogout = () => {
    localStorage.removeItem("jwt")
    localStorage.removeItem("user")
    setIsAuthenticated(false)
    setCurrentUser(null)
    setUsuarios([])
  }

  const canSearchDoctors = currentUser?.rol === "ADMIN"
  const canSearchUsers = currentUser?.rol === "ADMIN" || currentUser?.rol === "DOCTOR"

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Stethoscope className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Medical History Management</h1>
            <p className="text-muted-foreground">Secure and professional medical record system</p>
          </div>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold text-foreground">Welcome</CardTitle>
              <CardDescription>Access your medical records securely</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/register" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Register New Account
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted bg-transparent"
                >
                  Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Medical Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {currentUser?.nombre}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* User Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="text-foreground">
                  {currentUser?.nombre} {currentUser?.apellido}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-foreground">{currentUser?.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <p className="text-foreground capitalize">{currentUser?.rol.toLowerCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Filters */}
        {(canSearchDoctors || canSearchUsers) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Users
              </CardTitle>
              <CardDescription>Filter users by name and role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {canSearchDoctors && (
                  <div className="flex-1">
                    <Label htmlFor="doctor-name">Doctor Name</Label>
                    <Input
                      id="doctor-name"
                      placeholder="Search by doctor name..."
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                )}
                {canSearchUsers && (
                  <div className="flex-1">
                    <Label htmlFor="user-name">User Name</Label>
                    <Input
                      id="user-name"
                      placeholder="Search by user name..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({usuarios.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usuarios.map((usuario, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {usuario.nombre} {usuario.apellido}
                      </h3>
                      <p className="text-sm text-muted-foreground">{usuario.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          usuario.rol === "ADMIN"
                            ? "bg-red-100 text-red-800"
                            : usuario.rol === "DOCTOR"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {usuario.rol}
                      </span>
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
