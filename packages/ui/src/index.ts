// mikconnect — design system partagé.
// Composants pilotés par le skill Impeccable (PRODUCT.md + DESIGN.md).
// Tokens OKLCH câblés via ./styles/tokens.css → ./styles/theme.css (Tailwind v4).

// Primitives
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input, type InputProps } from "./components/input";
export { Label } from "./components/label";

// Surfaces & data
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  type TableCellProps,
} from "./components/table";

// Statut
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export {
  TicketCard,
  ticketStatusMap,
  type TicketCardProps,
  type TicketStatus,
} from "./components/ticket-card";

// Métriques
export { StatCard, type StatCardProps, type StatCardTrend } from "./components/stat-card";

// Overlay
export {
  Modal,
  ModalTrigger,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
  type ModalContentProps,
} from "./components/modal";

// Toast (primitives + Toaster + API imperative)
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  toastVariants,
  type ToastProps,
} from "./components/toast";
export { Toaster } from "./components/toaster";
export {
  toast,
  useToasts,
  dismissToast,
  type ToastRecord,
  type ToastTone,
  type ToastInput,
} from "./lib/toast-store";

// Utils
export { cn } from "./lib/cn";

export { House, Ticket, Users, Wifi, CreditCard, LogOut, Plus, ArrowUpRight, Bell, CircleHelp, Store, CheckCircle2, SignalHigh, Smartphone, ShieldCheck, ShieldBan, Unplug, ChevronRight, Copy, ExternalLink, ArrowRight, Check, Moon, Sun, Activity, RefreshCw, Clock3, Download, Upload, Router, Radio, UserRound, Building2, Palette, Ban, WifiOff, History, Trash2, FileDown, Search, Settings, CalendarDays } from "lucide-react";
