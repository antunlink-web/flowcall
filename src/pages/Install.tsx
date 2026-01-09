import { useState, useEffect } from "react";
import { Download, Smartphone, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 text-green-600 w-fit">
              <Check className="h-8 w-8" />
            </div>
            <CardTitle>Already Installed!</CardTitle>
            <CardDescription>
              FlowCall Dialer is installed on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = "/dialer"}>
              Open Dialer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 text-primary w-fit">
            <Smartphone className="h-8 w-8" />
          </div>
          <CardTitle>Install FlowCall Dialer</CardTitle>
          <CardDescription>
            Install this app on your phone to receive dial requests from your PC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deferredPrompt ? (
            <Button className="w-full gap-2" size="lg" onClick={handleInstall}>
              <Download className="h-5 w-5" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                To install on iOS:
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Tap the Share button <ExternalLink className="h-4 w-4 inline" /></li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                To install on Android:
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Tap the menu button (⋮) in your browser</li>
                <li>Select "Install app" or "Add to Home screen"</li>
                <li>Confirm the installation</li>
              </ol>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/dialer"}
            >
              Continue in Browser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
