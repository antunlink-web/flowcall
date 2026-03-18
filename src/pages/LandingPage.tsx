import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Phone, Smartphone, ArrowRight, CheckCircle2, X, Zap,
  Upload, PhoneCall, Target, BarChart3, Clock, Users,
  Building2, Briefcase, Home, UserCheck, Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import flowcallLogo from "@/assets/flowcall-logo.png";
import { translations, type LandingLang } from "@/lib/landing-translations";

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-primary mb-4">
      {children}
    </span>
  );
}

const langLabels: Record<LandingLang, string> = { en: "EN", hr: "HR" };

export default function LandingPage() {
  const [lang, setLang] = useState<LandingLang>(() => {
    const saved = localStorage.getItem("fc-landing-lang");
    return saved === "hr" ? "hr" : "en";
  });

  const t = translations[lang];

  const switchLang = (l: LandingLang) => {
    setLang(l);
    localStorage.setItem("fc-landing-lang", l);
  };

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
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">{t.pricing}</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">{t.howItWorks}</a>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">{langLabels[lang]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[100px]">
                <DropdownMenuItem onClick={() => switchLang("en")} className={lang === "en" ? "font-bold" : ""}>
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLang("hr")} className={lang === "hr" ? "font-bold" : ""}>
                  🇭🇷 Hrvatski
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/auth">
              <Button variant="ghost" size="sm">{t.signIn}</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">{t.startFreeTrial}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            {t.heroTitle1}
            <span className="text-primary">{t.heroTitle2}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            {t.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base px-8 h-12">
                {t.startFreeTrial} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="text-base px-8 h-12">
                {t.seeHowItWorks}
              </Button>
            </a>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground mt-2">
            {[t.trustAndroid, t.trustNoVoip, t.trustSim].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. COMPARISON */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>{t.smarterChoice}</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.whySwitching}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t.whySwitchingSub}
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
                  {[t.fc1, t.fc2, t.fc3, t.fc4, t.fc5, t.fc6].map(item => (
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
                  <span className="font-bold text-lg text-muted-foreground">{t.traditionalTools}</span>
                </div>
                <ul className="space-y-3">
                  {[t.tc1, t.tc2, t.tc3, t.tc4, t.tc5, t.tc6].map(item => (
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
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2.5s" }} />
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                <Smartphone className="w-14 h-14 md:w-18 md:h-18 text-primary" />
              </div>
            </div>

            <div className="text-center md:text-left">
              <SectionTag>{t.uniqueAdvantage}</SectionTag>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.smartphoneDialer}</h2>
              <p className="text-muted-foreground mb-6 max-w-lg leading-relaxed">
                {t.smartphoneDialerDesc}
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {[
                  { icon: PhoneCall, text: t.realCallerIdBullet },
                  { icon: Zap, text: t.worksInstantly },
                  { icon: Target, text: t.lowerCosts },
                  { icon: Smartphone, text: t.noExtraHardware },
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
          <SectionTag>{t.theProblem}</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-8">{t.toolsBroken}</h2>
          
          <div className="grid sm:grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto text-left">
            {[t.problem1, t.problem2, t.problem3, t.problem4].map(problem => (
              <div key={problem} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <X className="w-4 h-4 text-destructive/70 flex-shrink-0 mt-0.5" />
                <span>{problem}</span>
              </div>
            ))}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 md:p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2">{t.solutionTitle}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {t.solutionDesc}
            </p>
          </div>
        </div>
      </section>

      {/* 5. FEATURES (OUTCOME-DRIVEN) */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionTag>{t.resultsNotFeatures}</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold">{t.whatMatters}</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              { icon: Zap, title: t.feat1Title, desc: t.feat1Desc },
              { icon: Target, title: t.feat2Title, desc: t.feat2Desc },
              { icon: Clock, title: t.feat3Title, desc: t.feat3Desc },
              { icon: BarChart3, title: t.feat4Title, desc: t.feat4Desc },
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
          <SectionTag>{t.threeSteps}</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">{t.upAndRunning}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: Smartphone, title: t.step1Title, desc: t.step1Desc },
              { step: "2", icon: Upload, title: t.step2Title, desc: t.step2Desc },
              { step: "3", icon: PhoneCall, title: t.step3Title, desc: t.step3Desc },
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
            <SectionTag>{t.noSurprises}</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.simplePricing}</h2>
            <p className="text-muted-foreground">
              {t.pricingNote1}<span className="text-foreground font-medium">{t.pricingNote2}</span>{t.pricingNote3}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-8">
            {/* Basic */}
            <Card className="border-border/40 bg-card/40">
              <CardContent className="pt-6 pb-5">
                <h3 className="font-bold text-lg mb-1">{t.basic}</h3>
                <div className="mb-5">
                  <span className="text-4xl font-bold">€12</span>
                  <span className="text-muted-foreground text-sm">{t.perUserMonth}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[t.basicF1, t.basicF2, t.basicF3, t.basicF4, t.basicF5, t.basicF6].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">{t.getStarted}</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plus */}
            <Card className="border-primary/40 bg-primary/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <div className="absolute -top-0 right-4 mt-5">
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{t.popular}</span>
              </div>
              <CardContent className="pt-6 pb-5">
                <h3 className="font-bold text-lg mb-1">{t.plus}</h3>
                <div className="mb-5">
                  <span className="text-4xl font-bold">€18</span>
                  <span className="text-muted-foreground text-sm">{t.perUserMonth}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[t.plusF1, t.plusF2, t.plusF3, t.plusF4, t.plusF5, t.plusF6, t.plusF7].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full">{t.getStarted}</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {[t.freeTrial14, t.noContracts, t.cancelAnytime, t.noCreditCard].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 8. TARGET USERS */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SectionTag>{t.whoItsFor}</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-10">{t.builtForTeams}</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Phone, label: t.salesTeams },
              { icon: Building2, label: t.leadGenAgencies },
              { icon: Home, label: t.realEstate },
              { icon: UserCheck, label: t.recruiters },
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
            {t.startCallingToday}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {t.finalCtaSub}
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2 text-base px-10 h-12">
              {t.startFreeTrial} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            {t.noCreditCardCancel}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-6">
            {t.androidNote}
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
              © {new Date().getFullYear()} FlowCall. {t.allRightsReserved}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
