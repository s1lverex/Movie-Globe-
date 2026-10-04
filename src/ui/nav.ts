import { BookOpen, Compass, Heart, Info, Route, Stamp, UserRound } from 'lucide-react';
import type { AppMode } from '../store/useAppStore';

interface NavEntry {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
}

const EXPLORE: NavEntry = { to: '/', label: 'Explore', icon: Compass, end: true };
const CHARACTER: NavEntry = { to: '/character', label: 'My Character', icon: UserRound };
const ABOUT: NavEntry = { to: '/about', label: 'About', icon: Info };

/** Navigation differs per mode: film features vs. planner/diary. */
export const NAV_BY_MODE: Record<AppMode, NavEntry[]> = {
  movie: [
    EXPLORE,
    CHARACTER,
    { to: '/saved', label: 'Saved', icon: Heart },
    { to: '/tours', label: 'Tours', icon: Route },
    { to: '/passport', label: 'Passport', icon: Stamp },
    ABOUT,
  ],
  normal: [EXPLORE, CHARACTER, { to: '/trips', label: 'My Trips', icon: BookOpen }, ABOUT],
};
