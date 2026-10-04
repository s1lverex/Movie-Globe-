import { BookOpen, CircleUserRound, Compass, Heart, Info, PlayCircle, Route, Stamp, UserRound } from 'lucide-react';
import type { AppMode } from '../store/useAppStore';

interface NavEntry {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
}

const EXPLORE: NavEntry = { to: '/', label: 'Explore', icon: Compass, end: true };
const CHARACTER: NavEntry = { to: '/character', label: 'My Character', icon: UserRound };
const SUMMARY: NavEntry = { to: '/summary', label: 'Travel Summary', icon: PlayCircle };
const ACCOUNT: NavEntry = { to: '/account', label: 'Account', icon: CircleUserRound };
const ABOUT: NavEntry = { to: '/about', label: 'About', icon: Info };

/** Navigation differs per mode: film features vs. planner/diary. */
export const NAV_BY_MODE: Record<AppMode, NavEntry[]> = {
  movie: [
    EXPLORE,
    CHARACTER,
    { to: '/saved', label: 'Saved', icon: Heart },
    { to: '/tours', label: 'Tours', icon: Route },
    { to: '/passport', label: 'Passport', icon: Stamp },
    SUMMARY,
    ACCOUNT,
    ABOUT,
  ],
  normal: [EXPLORE, CHARACTER, { to: '/trips', label: 'My Trips', icon: BookOpen }, SUMMARY, ACCOUNT, ABOUT],
};
