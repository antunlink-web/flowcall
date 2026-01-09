import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  ListPlus,
  Users,
  UserCircle,
  Settings,
  CheckCircle2,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  completed?: boolean;
}

export function WelcomeContent() {
  const { user } = useAuth();
  const { branding } = useBranding();

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const appName = branding?.app_name || "the CRM";

  const onboardingSteps: OnboardingStep[] = [
    {
      icon: Phone,
      title: "Choose how you want to call",
      description: "Select from our range of calling options to tailor your outreach strategy effectively.",
      link: "/preferences",
      completed: false,
    },
    {
      icon: ListPlus,
      title: "Create a list",
      description: "Upload and configure a list of leads to call.",
      link: "/manage/lists",
      completed: false,
    },
    {
      icon: Users,
      title: "Invite Co-Workers",
      description: "Give others access to work your lists.",
      link: "/team",
      completed: false,
    },
    {
      icon: UserCircle,
      title: "Complete your profile",
      description: "Complete your details, change password, manage preferences etc.",
      link: "/preferences",
      completed: false,
    },
    {
      icon: Settings,
      title: "Manage your account",
      description: "Complete your details, change subscription plan, view invoices etc.",
      link: "/manage/account",
      completed: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-primary font-light">
          <span className="italic">Hello, {userName}!</span>
          <span className="text-muted-foreground text-xl ml-2">
            Here's a few simple steps to get started with {appName}.
          </span>
        </h1>
        <div className="h-0.5 bg-primary/30 mt-3 max-w-md" />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Onboarding steps */}
        <div className="lg:col-span-2 space-y-4">
          {onboardingSteps.map((step, index) => (
            <Link
              key={index}
              to={step.link}
              className="flex items-start gap-4 group hover:bg-muted/50 p-3 rounded-lg transition-colors -ml-3"
            >
              <div className="relative mt-1">
                <step.icon className="w-8 h-8 text-muted-foreground/60" />
                {step.completed && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 absolute -bottom-1 -right-1 bg-background rounded-full" />
                )}
              </div>
              <div>
                <h3 className="text-primary font-medium group-hover:underline">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Need help sidebar */}
        <div>
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3">Need help?</h3>
              
              <p className="text-sm text-muted-foreground mb-1">
                Read the{" "}
                <a href="#" className="text-primary hover:underline">
                  Getting Started Guide
                </a>
              </p>
              
              <p className="text-sm text-muted-foreground mb-4">
                Find answers to the most common problems in the{" "}
                <a href="#" className="text-primary hover:underline">
                  FAQ
                </a>
              </p>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Or simply</span>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Ask a question
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                We read and reply to every message, usually within an hour or two.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick intro section */}
      <div className="mt-12">
        <h2 className="text-2xl text-primary font-light mb-2">
          Start with a quick intro
        </h2>
        <div className="h-0.5 bg-primary/30 mb-4 max-w-[160px]" />
        
        <p className="text-muted-foreground mb-6 max-w-2xl">
          Hit the ground running with these super quick and to-the-point intros explaining 
          the core features and functionalities of {appName}.
        </p>

        {/* Video placeholder */}
        <div className="aspect-video max-w-2xl bg-foreground/90 rounded-lg flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
