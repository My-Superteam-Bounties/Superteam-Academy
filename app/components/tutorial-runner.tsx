"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps } from "react-joyride";
import { tutorialSteps } from "@/lib/tutorials";
import { useAuth } from "@/components/providers/auth-provider";

// Dynamic import to avoid SSR issues with Joyride
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

const STORAGE_PREFIX = "superteam_tutorial_seen_";

/**
 * Resolve a CSS custom property to its computed color value.
 * Creates a temporary element, applies the var(), and reads the computed color.
 */
function resolveColor(varName: string, fallback: string): string {
    if (typeof window === "undefined") return fallback;
    try {
        const el = document.createElement("div");
        el.style.color = `var(${varName}, ${fallback})`;
        document.body.appendChild(el);
        const resolved = getComputedStyle(el).color;
        document.body.removeChild(el);
        return resolved || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Renders a Joyride tutorial for a specific page.
 * Automatically shows on first visit, never again.
 */
export function TutorialRunner({ pageKey }: { pageKey: string }) {
    const { isAuthenticated, user } = useAuth();
    const [run, setRun] = useState(false);
    const [mounted, setMounted] = useState(false);

    const steps = tutorialSteps[pageKey];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !isAuthenticated || !user?.isOnboarded || !steps?.length) return;

        const storageKey = `${STORAGE_PREFIX}${pageKey}`;
        const seen = typeof window !== "undefined" && localStorage.getItem(storageKey);

        if (!seen) {
            const timer = setTimeout(() => setRun(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [mounted, isAuthenticated, user?.isOnboarded, pageKey, steps]);

    const handleCallback = useCallback(
        (data: CallBackProps) => {
            const { status } = data;
            const finishedStatuses = ["finished", "skipped"];

            if (finishedStatuses.includes(status as string)) {
                setRun(false);
                if (typeof window !== "undefined") {
                    localStorage.setItem(`${STORAGE_PREFIX}${pageKey}`, "true");
                }
            }
        },
        [pageKey]
    );

    // Resolve theme colors from CSS variables at runtime
    const joyrideStyles = useMemo(() => {
        if (!mounted) return {};

        const card = resolveColor("--card", "#1c1c1e");
        const cardFg = resolveColor("--card-foreground", "#e4e4e7");
        const mutedFg = resolveColor("--muted-foreground", "#71717a");
        const primary = resolveColor("--solana-purple", "#9945FF");
        const accent = resolveColor("--solana-green", "#14F195");

        return {
            options: {
                primaryColor: primary,
                zIndex: 10000,
                arrowColor: card,
                backgroundColor: card,
                textColor: cardFg,
                overlayColor: "rgba(0, 0, 0, 0.55)",
            },
            tooltip: {
                borderRadius: "16px",
                padding: "24px",
                fontSize: "14px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
            },
            tooltipContainer: {
                textAlign: "left" as const,
            },
            tooltipTitle: {
                fontSize: "16px",
                fontWeight: 700,
                color: cardFg,
                borderBottom: `2px solid ${primary}`,
                paddingBottom: "10px",
                marginBottom: "8px",
            },
            tooltipContent: {
                color: mutedFg,
                lineHeight: 1.6,
                padding: "8px 0 0 0",
            },
            buttonNext: {
                borderRadius: "9999px",
                padding: "8px 20px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: primary,
                color: "#ffffff",
            },
            buttonBack: {
                borderRadius: "9999px",
                padding: "8px 16px",
                fontSize: "13px",
                color: mutedFg,
            },
            buttonSkip: {
                fontSize: "12px",
                color: mutedFg,
            },
            buttonClose: {
                color: mutedFg,
            },
            spotlight: {
                borderRadius: "12px",
            },
            beacon: {
                display: "none" as const,
            },
        };
    }, [mounted]);

    if (!mounted || !steps?.length) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            showProgress
            callback={handleCallback}
            styles={joyrideStyles}
            locale={{
                back: "Back",
                close: "Got it",
                last: "Done!",
                next: "Next",
                skip: "Skip tour",
            }}
        />
    );
}
