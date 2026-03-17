import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Phone, Smartphone, ArrowRight, CheckCircle2, X, Zap,
  Upload, PhoneCall, Target, BarChart3, Clock, Users,
  Building2, Briefcase, Home, UserCheck,
} from "lucide-react";
import flowcallLogo from "@/assets/flowcall-logo.png";

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-primary mb-4">
      {children}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="border-b border-border/30 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-7 w-7" />
            <span className="font-bold text-lg">FlowCall</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Pricing</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">How It Works</a>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Stop Overpaying for{" "}
            <span className="text-primary">Cold Calling Software</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Make more calls using your own phone. No VoIP, no complex setup, no unnecessary features. Just results.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base px-8 h-12">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="text-base px-8 h-12">
                See How It Works
              </Button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Setup in under 2 minutes
            </span>
          </div>
        </div>
      </section>

      {/* 2. COMPARISON */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>The Smarter Choice</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Teams Are Switching from Complex Tools</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              You don't need 200 features. You need to make more calls and close more deals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FlowCall */}
            <Card className="border-primary/40 bg-primary/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center gap-2 mb-5">
                  <img src={flowcallLogo} alt="" className="h-5 w-5" />
                  <span className="font-bold text-lg">FlowCall</span>
                </div>
                <ul className="space-y-3">
                  {[
                    "€12–€18 per user/month",
                    "Setup in minutes, not days",
                    "Uses your real phone number",
                    "Clean, simple interface",
                    "No training required",
                    "Higher pickup rates (real caller ID)",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Others */}
            <Card className="border-border/30 bg-card/30 relative overflow-hidden opacity-75">
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted-foreground/30" />
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center gap-2 mb-5">
                  <span className="font-bold text-lg text-muted-foreground">Traditional Tools</span>
                </div>
                <ul className="space-y-3">
                  {[
                    "€50–€150+ per user/month",
                    "Complex onboarding process",
                    "VoIP setup required",
                    "Feature overload",
                    "Requires training & support",
                    "VoIP numbers get ignored",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X className="w-4 h-4 text-destructive/60 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. UNIQUE MECHANISM */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            {/* Visual */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2.5s" }} />
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                <Smartphone className="w-14 h-14 md:w-18 md:h-18 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center md:text-left">
              <SectionTag>Unique Advantage</SectionTag>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Smartphone Becomes Your Dialer</h2>
              <p className="text-muted-foreground mb-6 max-w-lg leading-relaxed">
                Connect your phone to your computer. Click to call from your CRM. Send SMS directly. 
                No extra hardware, no VoIP costs — your real number, higher pickup rates.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {[
                  { icon: PhoneCall, text: "Higher pickup rates" },
                  { icon: Zap, text: "Works instantly" },
                  { icon: Target, text: "Lower costs" },
                  { icon: Smartphone, text: "No extra hardware" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM → SOLUTION */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SectionTag>The Problem</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Cold Calling Tools Are Broken</h2>
          
          <div className="grid sm:grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto text-left">
            {[
              "Expensive subscriptions eating into profits",
              "Low answer rates — VoIP numbers get ignored",
              "Too complex for small, fast-moving teams",
              "Agents waste time navigating bloated interfaces",
            ].map(problem => (
              <div key={problem} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <X className="w-4 h-4 text-destructive/70 flex-shrink-0 mt-0.5" />
                <span>{problem}</span>
              </div>
            ))}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 md:p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2">The FlowCall Solution</h3>
            <p className="text-muted-foreground leading-relaxed">
              FlowCall gives you only what you need to call faster and close more deals.
              No feature bloat, no VoIP headaches, no enterprise pricing for basic calling needs.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FEATURES (OUTCOME-DRIVEN) */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>Results, Not Features</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold">What Actually Matters</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              { icon: Zap, title: "Call 5x More Leads Per Hour", desc: "Streamlined workflow eliminates wasted clicks. Click, call, log, next." },
              { icon: Target, title: "Never Lose a Lead Again", desc: "Smart callbacks, status tracking, and team assignment keep every lead visible." },
              { icon: Clock, title: "Follow Up Automatically", desc: "Scheduled callbacks surface at exactly the right time. No lead falls through the cracks." },
              { icon: BarChart3, title: "See What's Working in Real-Time", desc: "Live dashboards show call volume, outcomes, and team performance at a glance." },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-border/30 bg-card/30">
                <CardContent className="pt-5 pb-4">
                  <Icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-base mb-1.5">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SectionTag>3 Simple Steps</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Up and Running in Minutes</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: Smartphone, title: "Connect Your Phone", desc: "Download the companion app and pair with your desktop in seconds." },
              { step: "2", icon: Upload, title: "Upload Your Leads", desc: "Import a CSV or add leads manually. Map fields in one click." },
              { step: "3", icon: PhoneCall, title: "Start Calling", desc: "Click to dial. Your phone rings. Talk, log outcome, move to next lead." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg mb-4">
                  {step}
                </div>
                <Icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-bold text-base mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PRICING */}
      <section id="pricing" className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionTag>No Surprises</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">
              Most cold calling tools charge <span className="text-foreground font-medium">€50–€150 per user</span>. We don't.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-8">
            {/* Basic */}
            <Card className="border-border/40 bg-card/40">
              <CardContent className="pt-6 pb-5">
                <h3 className="font-bold text-lg mb-1">Basic</h3>
                <div className="mb-5">
                  <span className="text-4xl font-bold">€12</span>
                  <span className="text-muted-foreground text-sm">/user/month</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "1 calling list",
                    "Email & SMS integration",
                    "Call scripts",
                    "Callback scheduling",
                    "Duplicate detection",
                    "Premium support",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plus */}
            <Card className="border-primary/40 bg-primary/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <div className="absolute -top-0 right-4 mt-5">
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>
              </div>
              <CardContent className="pt-6 pb-5">
                <h3 className="font-bold text-lg mb-1">Plus</h3>
                <div className="mb-5">
                  <span className="text-4xl font-bold">€18</span>
                  <span className="text-muted-foreground text-sm">/user/month</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "Everything in Basic",
                    "5 calling lists",
                    "Campaigns",
                    "Team management",
                    "Reports & Analytics",
                    "Multi-device support",
                    "Bulk deduplication",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              No contracts
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* 8. TARGET USERS */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SectionTag>Who It's For</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-10">Built for Teams That Rely on Calls</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Phone, label: "Sales Teams" },
              { icon: Building2, label: "Lead Gen Agencies" },
              { icon: Home, label: "Real Estate" },
              { icon: UserCheck, label: "Recruiters" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/30 border border-border/20">
                <Icon className="w-7 h-7 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Calling Today — Not Next Week
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Set up in minutes and make your first calls immediately. No demos, no sales calls, no waiting.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2 text-base px-10 h-12">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={flowcallLogo} alt="FlowCall" className="h-5 w-5" />
              <span className="font-semibold text-sm">FlowCall</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} FlowCall. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
