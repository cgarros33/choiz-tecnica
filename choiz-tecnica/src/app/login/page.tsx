"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Stethoscope, LogIn } from "lucide-react"

interface LoginFormData {
    email: string
    password: string
}

export default function LoginPage() {
    const [formData, setFormData] = useState<LoginFormData>({
        email: "",
        password: "",
    })
    const [isLoading, setIsLoading] = useState(false)

    const handleInputChange = (field: keyof LoginFormData, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // This is where you would make your POST request to your API
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                const data = await response.json();
                localStorage.removeItem("jwt")
                localStorage.removeItem("user")
                localStorage.setItem("jwt", data.access_token);
                localStorage.setItem("user", JSON.stringify(data.usuario));
                console.log("Login successful")
                window.location.href = "/"
            } else {
                console.log("Login failed")
            }
        } catch (error) {
            console.error("Login error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Stethoscope className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Medical Records System</h1>
                    <p className="text-muted-foreground">Sign in to access your account</p>
                </div>

                <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            <LogIn className="h-5 w-5" />
                            Sign In
                        </CardTitle>
                        <CardDescription>Enter your credentials to access your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    required
                                    className="bg-input border-border"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => handleInputChange("password", e.target.value)}
                                    required
                                    className="bg-input border-border"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                disabled={isLoading}
                            >
                                {isLoading ? "Signing In..." : "Sign In"}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <a href="/register" className="text-primary hover:text-primary/80 font-medium">
                                    Create one here
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
