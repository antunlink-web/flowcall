import { CheckCircle2, Clock, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function RegistrationPending() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Registration Received!</CardTitle>
          <CardDescription className="text-base">
            Thank you for registering your organization with FlowCall
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Application Submitted</p>
                <p className="text-sm text-muted-foreground">
                  We have received your registration request
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-left">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Pending Review</p>
                <p className="text-sm text-muted-foreground">
                  Our team is reviewing your application and setting up your subdomain
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-left">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Email Notification</p>
                <p className="text-sm text-muted-foreground">
                  You will receive an email when your account and subdomain are approved
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            This usually takes 1-2 business days. If you have any questions, please contact our support team.
          </p>

          <Button variant="outline" asChild className="w-full">
            <Link to="/">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
