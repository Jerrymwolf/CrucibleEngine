/**
 * Console Components
 *
 * Components for the crisis management command center during the storm phase.
 *
 * The CommandCenter component orchestrates all panels into a responsive layout:
 * - Desktop: 3-panel grid (Map | Decisions | Resources)
 * - Mobile: Tab-based interface
 */

// Main Layout
export { CommandCenter, type CommandCenterProps } from './CommandCenter.js';

// Map & Geography
export { ConcordiaMap } from './ConcordiaMap.js';

// Weather
export { WeatherPanel } from './WeatherPanel.js';

// Resources & Status
export { ResourceDashboard } from './ResourceDashboard.js';

// Production & Business Metrics
export { ProductionDashboard } from './ProductionDashboard.js';
export { ProductionHeader } from './ProductionHeader.js';

// Decision Making
export { DecisionInterface } from './DecisionInterface.js';
export { DilemmaInterface } from './DilemmaInterface.js';

// News & Social
export { NewsTicker, type NewsItem, type NewsTickerProps } from './NewsTicker.js';
export { SocialFeed, type FeedItem, type SocialFeedProps } from './SocialFeed.js';

// Alerts
export {
  AlertSystem,
  AlertProvider,
  useAlerts,
  type Alert,
  type AlertLevel,
  type AlertSystemProps,
} from './AlertSystem.js';

// Quick Actions (Sprint 3 - Stormgate-inspired)
export { QuickActionPanel, type QuickActionTab } from './QuickActionPanel.js';
export { ConsoleHeader, type ConsoleHeaderProps } from './ConsoleHeader.js';

// Command View (Sprint 5.5 - Dual-view architecture)
export { CommandView, type ViewMode } from './CommandView.js';
export { MiniMap } from './MiniMap.js';
