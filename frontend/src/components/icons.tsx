import {
  LayoutDashboard, Wifi, ClipboardCheck, Ticket, Receipt,
  Users, Globe, UserCog, TrendingUp, Settings,
  Sun, Moon, LogOut, Menu, X, ArrowRight, WifiOff,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon vocabulary used across the app. Centralized so we can swap
 * stroke widths / sizing in one place and avoid the SVG-inline paste
 * antipattern that otherwise spreads across the codebase.
 *
 * All icons are Lucide-sized by default (24px viewbox) and inherit color.
 */

export interface AppIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const wrap = (Icon: LucideIcon) => {
  const Cmp = ({ size = 20, strokeWidth = 1.75, className }: AppIconProps) => (
    <Icon size={size} strokeWidth={strokeWidth} className={className} />
  );
  Cmp.displayName = `Icon(${Icon.displayName ?? Icon.name})`;
  return Cmp;
};

export const IconDashboard = wrap(LayoutDashboard);
export const IconHotspots = wrap(Wifi);
export const IconPlans = wrap(ClipboardCheck);
export const IconVouchers = wrap(Ticket);
export const IconTransactions = wrap(Receipt);
export const IconResellers = wrap(Users);
export const IconRoaming = wrap(Globe);
export const IconUsers = wrap(UserCog);
export const IconPartners = wrap(TrendingUp);
export const IconSettings = wrap(Settings);
export const IconSun = wrap(Sun);
export const IconMoon = wrap(Moon);
export const IconLogout = wrap(LogOut);
export const IconMenu = wrap(Menu);
export const IconClose = wrap(X);
export const IconArrowRight = wrap(ArrowRight);
export const IconWifiOff = wrap(WifiOff);
