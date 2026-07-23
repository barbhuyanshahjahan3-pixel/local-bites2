import { useEffect, useState, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from './SplashScreen';
import OnboardingSlides from './OnboardingSlides';
import LocationPermissionScreen from './LocationPermissionScreen';

const ONBOARDED_KEY = 'lb_onboarded';
const SPLASH_MS = 1300;

type Stage = 'splash' | 'onboarding' | 'location' | 'done';

/**
 * Runs once per app load (fresh open, not client-side navigation):
 *  1. Splash (logo + spinner) — always, briefly.
 *  2. Onboarding slides — only the very first time the app is ever opened.
 *  3. Location permission lead-in — only right after onboarding, same
 *     first-time-only run.
 * Returning users (lb_onboarded already set) just see the splash, then
 * go straight into the app — same as Zomato/Swiggy's repeat-open behavior.
 */
export default function AppLaunchFlow({ children }: { children: ReactNode }) {
  const alreadyOnboarded = () => localStorage.getItem(ONBOARDED_KEY) === '1';
  const [stage, setStage] = useState<Stage>('splash');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage(alreadyOnboarded() ? 'done' : 'onboarding');
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const finishOnboarding = () => setStage('location');
  const finishLocation = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setStage('done');
  };

  return (
    <>
      <AnimatePresence>
        {stage === 'splash' && <SplashScreen key="splash" />}
        {stage === 'onboarding' && <OnboardingSlides key="onboarding" onDone={finishOnboarding} />}
        {stage === 'location' && (
          <LocationPermissionScreen key="location" onDone={finishLocation} />
        )}
      </AnimatePresence>
      {stage === 'done' && children}
    </>
  );
}
