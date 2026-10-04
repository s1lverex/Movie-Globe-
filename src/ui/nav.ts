import { Compass, Heart, Info, Route, Stamp, UserRound } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Explore', icon: Compass, end: true },
  { to: '/character', label: 'My Character', icon: UserRound },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/tours', label: 'Tours', icon: Route },
  { to: '/passport', label: 'Passport', icon: Stamp },
  { to: '/about', label: 'About', icon: Info },
];
