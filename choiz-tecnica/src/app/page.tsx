import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Stethoscope } from "lucide-react"

export default function Home() {
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
              <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted bg-transparent">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
