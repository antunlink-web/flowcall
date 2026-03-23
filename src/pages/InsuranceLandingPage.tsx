import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Phone, Smartphone, ArrowRight, CheckCircle2,
  Upload, PhoneCall, ClipboardList, Clock, Shield,
  FileText, Users, MessageSquare, ChevronDown,
} from "lucide-react";
import flowcallLogo from "@/assets/flowcall-logo.png";
import { useState } from "react";

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-primary mb-4">
      {children}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-card/50 transition-colors"
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function InsuranceLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="border-b border-border/30 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-7 w-7" />
            <span className="font-bold text-lg">FlowCall</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#kako-radi" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">
              Kako radi
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">
              Pitanja
            </a>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Prijava</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Isprobajte besplatno</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-6">
            <Shield className="w-3.5 h-3.5" />
            Za agencije i zastupnike u osiguranju
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Jednostavniji rad s{" "}
            <span className="text-primary">postojećim klijentima</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Pozivi, bilješke i podsjetnici na jednom mjestu — bez Excela i papira.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base px-8 h-12">
                Isprobajte besplatno 14 dana <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground mt-2">
            {[
              "Pozivi s vašeg broja (bez VoIP-a)",
              "Radi preko Android telefona",
              "Setup u 2 minute",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. REAL SITUATION */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionTag>Poznata situacija?</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Većina agencija danas radi ovako
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            {[
              "Klijenti u Excelu ili bilježnici",
              "Podsjetnici u kalendaru ili \u201Eu glavi\u201C",
              "Pozivi i bilješke nisu povezani",
              "Traženje brojeva oduzima vrijeme",
            ].map((problem) => (
              <div key={problem} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <ClipboardList className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                <span>{problem}</span>
              </div>
            ))}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 md:p-8 max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground leading-relaxed">
              Sve funkcionira — ali uz puno ručnog rada.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SOLUTION */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SectionTag>Jednostavnije</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            FlowCall to pojednostavljuje
          </h2>
          <div className="bg-card/50 border border-border/30 rounded-xl p-6 md:p-8 max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base">
              {[
                "lista klijenata",
                "→",
                "klik",
                "→",
                "poziv s vašeg broja",
                "→",
                "bilješka",
                "→",
                "sljedeći klijent",
              ].map((step, i) => (
                <span
                  key={i}
                  className={
                    step === "→"
                      ? "text-primary font-bold"
                      : "bg-primary/10 border border-primary/20 rounded-md px-3 py-1.5 font-medium"
                  }
                >
                  {step}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-5">
              Sve ide redom, bez traženja i bez prebacivanja između alata.
            </p>
          </div>
        </div>
      </section>

      {/* 4. USE CASES */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionTag>Najčešća primjena</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold">Najčešće se koristi za</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {[
              { icon: Clock, text: "Podsjetnike za isteke polica" },
              { icon: Users, text: "Komunikaciju s postojećim klijentima" },
              { icon: MessageSquare, text: "Brzi follow-up nakon upita" },
              { icon: FileText, text: "Evidenciju razgovora" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 p-4 rounded-lg bg-card/30 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. BENEFITS */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionTag>Prednosti</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold">Zašto agencije koriste FlowCall</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              "Sve na jednom mjestu",
              "Manje grešaka i zaboravljenih follow-upova",
              "Brži rad tijekom dana",
              "Nema potrebe za Excelom i papirima",
              "Koristite svoj broj — klijenti vas prepoznaju",
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-2.5 text-sm p-3">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="kako-radi" className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SectionTag>3 koraka</SectionTag>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Kako to izgleda u praksi</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: Upload,
                title: "Ubacite klijente",
                desc: "Uvezite iz Excela ili dodajte ručno. Mapirajte polja jednim klikom.",
              },
              {
                step: "2",
                icon: PhoneCall,
                title: "Kliknete i zovete",
                desc: "Poziv ide s vašeg mobitela. Klijent vidi vaš broj.",
              },
              {
                step: "3",
                icon: FileText,
                title: "Upišete bilješku",
                desc: "Nakon poziva zabilježite ishod i prijeđite na sljedećeg klijenta.",
              },
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

      {/* 7. TRUST / ALIGNMENT */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 md:p-10">
            <Smartphone className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Ne morate mijenjati način rada
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              — samo ga pojednostaviti.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="py-16 md:py-20 bg-card/50 border-y border-border/30">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <SectionTag>Česta pitanja</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold">FAQ</h2>
          </div>

          <div className="space-y-3">
            <FaqItem
              q="Da li je ovo za hladne pozive?"
              a="Ne. FlowCall je namijenjen radu s postojećim klijentima i organizaciji komunikacije."
            />
            <FaqItem
              q="Da li koristim svoj broj?"
              a="Da, pozivi idu direktno s vašeg mobitela."
            />
            <FaqItem
              q="Trebam li dodatnu opremu?"
              a="Ne, dovoljan je Android telefon."
            />
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Testirajte na 10–20 postojećih klijenata i vidite razliku.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Bez ugovora, bez kreditne kartice. Pokrećete za 2 minute.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2 text-base px-10 h-12">
              Pokreni besplatno testiranje <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Nije potrebna kreditna kartica • Otkažite bilo kada
          </p>
          <p className="text-xs text-muted-foreground/60 mt-6">
            FlowCall radi s Android pametnim telefonima. iOS podrška još nije dostupna.
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
              © {new Date().getFullYear()} FlowCall. Sva prava pridržana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
