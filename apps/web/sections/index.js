// ─────────────────────────────────────────────────────────────
//  DASHBOARD SECTIONS REGISTRY
//  Each entry becomes a tab in the editor's navigation (in this order).
//  `group` puts a small heading above a set of tabs in the desktop menu.
//  Add a section: create a component that receives { ed } and list it here.
//  `ed` = { page, set(updater, mergeKey), pageUrl, savedSlug, analytics, dirty, pendingBookings, pendingReviews, pendingOrders,
//          refreshPending, plan, today, setToday }
// ─────────────────────────────────────────────────────────────
import { CalendarDays, ClipboardList, Star, Link2, UserRound, Palette, Image as ImageIcon, SlidersHorizontal, Settings, BarChart3, MapPin, ShoppingBag, Stamp, ReceiptText, LayoutTemplate, BellRing } from 'lucide-react';
import LinksSection from './LinksSection';
import ProfileSection from './ProfileSection';
import ThemeSection from './ThemeSection';
import WallpaperSection from './WallpaperSection';
import StyleSection from './StyleSection';
import SettingsSection from './SettingsSection';
import AnalyticsSection from './AnalyticsSection';
import AgendaSection from './AgendaSection';
import ResponsesSection from './ResponsesSection';
import ReviewsSection from './ReviewsSection';
import TodaySection from './TodaySection';
import OrdersSection from './OrdersSection';
import LoyaltySection from './LoyaltySection';
import InvoicesSection from './InvoicesSection';
import TemplatesSection from './TemplatesSection';
import NotifySection from './NotifySection';

export const sections = [
  // Build the page
  { id: 'links', label: 'Links', icon: Link2, Component: LinksSection, group: 'Page' },
  { id: 'profile', label: 'Profile', icon: UserRound, Component: ProfileSection, group: 'Page' },
  { id: 'today', label: 'Today', icon: MapPin, Component: TodaySection, group: 'Page' },
  // Look
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, Component: TemplatesSection, wide: true, group: 'Design' },
  { id: 'theme', label: 'Theme', icon: Palette, Component: ThemeSection, group: 'Design' },
  { id: 'wallpaper', label: 'Wallpaper', icon: ImageIcon, Component: WallpaperSection, group: 'Design' },
  { id: 'style', label: 'Style', icon: SlidersHorizontal, Component: StyleSection, group: 'Design' },
  // What visitors do. `badge` names a number in `ed` shown next to the label.
  { id: 'orders', label: 'Orders', icon: ShoppingBag, Component: OrdersSection, wide: true, badge: 'pendingOrders', group: 'Activity' },
  { id: 'invoices', label: 'Invoices', icon: ReceiptText, Component: InvoicesSection, wide: true, group: 'Activity' },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, Component: AgendaSection, wide: true, badge: 'pendingBookings', group: 'Activity' },
  { id: 'reviews', label: 'Reviews', icon: Star, Component: ReviewsSection, wide: true, badge: 'pendingReviews', group: 'Activity' },
  { id: 'loyalty', label: 'Loyalty', icon: Stamp, Component: LoyaltySection, wide: true, group: 'Activity' },
  { id: 'notify', label: 'Notifications', icon: BellRing, Component: NotifySection, wide: true, group: 'Activity' },
  { id: 'responses', label: 'Responses', icon: ClipboardList, Component: ResponsesSection, wide: true, group: 'Activity' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, Component: AnalyticsSection, wide: true, group: 'Activity' },
  // Always last
  { id: 'settings', label: 'Settings', icon: Settings, Component: SettingsSection, group: 'Settings' },
];
