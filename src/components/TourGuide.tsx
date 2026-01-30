import Joyride, { CallBackProps, STATUS, Step, ACTIONS } from "react-joyride";
import { useTour } from "@/hooks/useTour";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const tourSteps: Step[] = [
  // Welcome
  {
    target: "body",
    placement: "center",
    title: "Welcome to FlowCall! 👋",
    content: "Let's take a quick tour to help you get started with your cold calling CRM. This will only take a minute.",
    disableBeacon: true,
  },
  // Control Panel Grid
  {
    target: '[data-tour="control-panel"]',
    title: "Control Panel",
    content: "This is your command center. Access all main features from these quick-action cards.",
    placement: "bottom",
  },
  {
    target: '[data-tour="work-card"]',
    title: "Start Working",
    content: "Click here to access the dialer, view your scheduled callbacks, and manage your locked leads.",
    placement: "right",
  },
  {
    target: '[data-tour="manage-card"]',
    title: "Manage Everything",
    content: "Configure lead lists, manage your team, handle duplicates, and adjust account settings.",
    placement: "left",
  },
  // Top Navigation
  {
    target: '[data-tour="dashboard-icon"]',
    title: "Dashboard",
    content: "View your performance analytics, call statistics, and track your daily progress here.",
    placement: "bottom",
  },
  {
    target: '[data-tour="callback-badge"]',
    title: "Due Callbacks",
    content: "This badge shows how many scheduled callbacks are due. Never miss a follow-up!",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="trial-badge"]',
    title: "Trial Status",
    content: "Keep track of your trial period here. You have 14 days to explore all features.",
    placement: "bottom",
  },
  // User Menu
  {
    target: '[data-tour="user-menu"]',
    title: "Your Account",
    content: "Access your profile, preferences, and sign out from this menu. You can also replay this tour from Preferences.",
    placement: "bottom-end",
  },
  // Final
  {
    target: "body",
    placement: "center",
    title: "You're All Set! 🎉",
    content: "You can restart this tour anytime from Preferences → Tour. Now let's start making calls!",
  },
];

export function TourGuide() {
  const { runTour, endTour, hasSeenTour, startTour } = useTour();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Auto-start tour for new users on control panel - ONLY when logged in
  useEffect(() => {
    if (user && !hasSeenTour && location.pathname === "/" && !runTour) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, hasSeenTour, location.pathname, runTour, startTour]);

  // Ensure we're on the control panel for the tour
  useEffect(() => {
    if (runTour && location.pathname !== "/") {
      navigate("/");
    }
  }, [runTour, location.pathname, navigate]);

  // Check if tour elements are ready
  useEffect(() => {
    if (runTour) {
      const timer = setTimeout(() => setIsReady(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
      setStepIndex(0);
    }
  }, [runTour]);

  const handleCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      endTour();
      setStepIndex(0);
    }

    if (action === ACTIONS.CLOSE) {
      endTour();
      setStepIndex(0);
    }

    if (type === "step:after") {
      setStepIndex(index + 1);
    }
  };

  if (!runTour || !isReady) return null;

  return (
    <Joyride
      steps={tourSteps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableOverlayClose
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          backgroundColor: "hsl(var(--card))",
          textColor: "hsl(var(--card-foreground))",
          arrowColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: 1.6,
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: 500,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
        spotlight: {
          borderRadius: "12px",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Get Started",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
