import { CheckCircle2, Clock, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export default function RegistrationPending() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t.registrationReceived}</CardTitle>
          <CardDescription className="text-base">{t.thankYouRegistering}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t.applicationSubmitted}</p>
                <p className="text-sm text-muted-foreground">{t.weReceivedRequest}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t.pendingReview}</p>
                <p className="text-sm text-muted-foreground">{t.teamReviewingApp}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t.emailNotification}</p>
                <p className="text-sm text-muted-foreground">{t.emailWhenApproved}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t.usuallyTakes}</p>
          <Button variant="outline" asChild className="w-full">
            <Link to="/">{t.returnToHome}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
