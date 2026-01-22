import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Phone, 
  Users, 
  BarChart3, 
  Smartphone, 
  Shield, 
  Clock,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import flowcallLogo from "@/assets/flowcall-logo.png";

const features = [
  {
    icon: Phone,
    title: "Power Dialer",
    description: "Maximize call efficiency with automated dialing and seamless lead progression."
  },
  {
    icon: Smartphone,
    title: "Use Your Smartphone",
    description: "Dial and send SMS directly from your phone. Work from your PC, call from your pocket."
  },
  {
    icon: Users,
    title: "Lead Management",
    description: "Organize, track, and nurture leads with intelligent list management."
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Gain insights with comprehensive reporting and performance metrics."
  },
  {
    icon: Shield,
    title: "Multi-Tenant Security",
    description: "Enterprise-grade security with isolated workspaces for each organization."
  },
  {
    icon: Clock,
    title: "Callback Scheduling",
    description: "Never miss a follow-up with smart callback scheduling and reminders."
  }
];

const plans = [
  {
    name: "Basic",
    price: "€12",
    period: "/user/month",
    features: [
      "1 calling list",
      "Email & SMS integration",
      "Call scripts",
      "Callback scheduling",
      "Duplicate detection",
      "Premium support"
    ]
  },
  {
    name: "Plus",
    price: "€18",
    period: "/user/month",
    popular: true,
    features: [
      "Everything in Basic",
      "5 calling lists",
      "Campaigns",
      "Team management",
      "Reports & Analytics",
      "Multi-device support",
      "Bulk deduplication"
    ]
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-8 w-8" />
            <span className="font-bold text-xl">FlowCall</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Modern CRM for
            <span className="text-primary"> High-Volume Calling</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Empower your sales team with intelligent lead management, power dialing, 
            and real-time analytics. Close more deals, faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Sign In to Your Workspace
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Get your own workspace at <strong>yourcompany.flowcall.eu</strong>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything You Need to Scale
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Built for teams that make calls. From solo agents to enterprise call centers.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Start free, upgrade when you're ready. No hidden fees.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="pt-8">
                  <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Sales?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join hundreds of teams using FlowCall to close more deals every day.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Start Your Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={flowcallLogo} alt="FlowCall" className="h-6 w-6" />
              <span className="font-semibold">FlowCall</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FlowCall. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
