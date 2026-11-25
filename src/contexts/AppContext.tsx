import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ApiClientError,
  fetchAirQualityData,
  queryAiHealthAssistant,
  reverseLookupApi,
} from '../services/api.ts';
import type {
  ActivityType,
  AiProviderPreference,
  AirQualityDataset,
  AlertThresholds,
  AppSection,
  AqiStandard,
  ChatMessage,
  LocationInfo,
  RecommendationResult,
  SensitivityGroup,
  SmartAlertItem,
} from '../types/airQuality.ts';
import {
  evaluateSmartAlerts,
  getBrowserNotificationPermission,
  isEmbeddedIframe,
  requestBrowserNotificationPermission,
  dispatchBrowserNotification,
} from '../utils/alerts.ts';
import { DEFAULT_FALLBACK_LOCATION } from '../utils/aqi.ts';
import {
  buildRuleBasedStructuredAdvice,
  generateRuleBasedRecommendation,
} from '../utils/recommendations.ts';
import {
  type ThemeMode,
  readStoredRecentLocations,
  readStoredTheme,
  readStoredThresholds,
  saveRecentLocations,
  saveTheme,
  saveThresholds,
} from '../utils/storage.ts';

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error';

export type { ThemeMode };

interface AppContextValue {
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
  location: LocationInfo;
  recentLocations: LocationInfo[];
  selectLocation: (loc: LocationInfo) => void;
  selectCoordinates: (lat: number, lon: number, source?: 'coordinates' | 'map') => Promise<void>;
  requestGeolocation: () => void;
  geolocationStatus: GeolocationStatus;
  geolocationMessage: string | null;
  dataset: AirQualityDataset | null;
  loading: boolean;
  error: string | null;
  refreshAirQuality: () => void;
  aqiStandard: AqiStandard;
  setAqiStandard: (standard: AqiStandard) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  sensitivityGroup: SensitivityGroup;
  setSensitivityGroup: (group: SensitivityGroup) => void;
  activity: ActivityType;
  setActivity: (activity: ActivityType) => void;
  recommendation: RecommendationResult;
  alertThresholds: AlertThresholds;
  updateAlertThresholds: (next: Partial<AlertThresholds>) => void;
  alerts: SmartAlertItem[];
  notificationPermission: NotificationPermission | 'unsupported';
  notificationFeedback: { tone: 'success' | 'warning' | 'info'; message: string } | null;
  inAppAlertsEnabled: boolean;
  setInAppAlertsEnabled: (enabled: boolean) => void;
  enableBrowserNotifications: () => Promise<void>;
  aiProvider: AiProviderPreference;
  setAiProvider: (provider: AiProviderPreference) => void;
  chatMessages: ChatMessage[];
  aiLoading: boolean;
  askAiAssistant: (question: string) => Promise<void>;
  clearChatHistory: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [recentLocations, setRecentLocations] = useState<LocationInfo[]>(() =>
    readStoredRecentLocations()
  );
  const [location, setLocation] = useState<LocationInfo>(() => DEFAULT_FALLBACK_LOCATION);
  const [geolocationStatus, setGeolocationStatus] = useState<GeolocationStatus>('idle');
  const [geolocationMessage, setGeolocationMessage] = useState<string | null>(null);

  const [dataset, setDataset] = useState<AirQualityDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [aqiStandard, setAqiStandard] = useState<AqiStandard>('us');
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());
  const [sensitivityGroup, setSensitivityGroup] = useState<SensitivityGroup>('general');
  const [activity, setActivity] = useState<ActivityType>('general');

  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(() =>
    readStoredThresholds()
  );
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getBrowserNotificationPermission());
  const [notificationFeedback, setNotificationFeedback] = useState<{
    tone: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [inAppAlertsEnabled, setInAppAlertsEnabled] = useState<boolean>(true);

  const [aiProvider, setAiProvider] = useState<AiProviderPreference>('auto');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const lastNotifiedKeyRef = useRef<string | null>(null);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const recordRecentLocation = useCallback((loc: LocationInfo) => {
    setRecentLocations((prev) => {
      const filtered = prev.filter(
        (item) =>
          Math.abs(item.latitude - loc.latitude) > 0.01 ||
          Math.abs(item.longitude - loc.longitude) > 0.01
      );
      const next = [loc, ...filtered].slice(0, 6);
      saveRecentLocations(next);
      return next;
    });
  }, []);

  const selectLocation = useCallback(
    (loc: LocationInfo) => {
      setLocation(loc);
      recordRecentLocation(loc);
    },
    [recordRecentLocation]
  );

  const selectCoordinates = useCallback(
    async (lat: number, lon: number, source: 'coordinates' | 'map' = 'coordinates') => {
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLon = Math.round(lon * 10000) / 10000;
      const tempLoc: LocationInfo = {
        id: `coord-${roundedLat}-${roundedLon}`,
        name: `Coordinates (${roundedLat.toFixed(2)}, ${roundedLon.toFixed(2)})`,
        latitude: roundedLat,
        longitude: roundedLon,
        source,
      };
      setLocation(tempLoc);
      try {
        const resolved = await reverseLookupApi(roundedLat, roundedLon);
        const enriched: LocationInfo = {
          ...tempLoc,
          name: resolved.name,
          region: resolved.region,
          country: resolved.country,
        };
        setLocation(enriched);
        recordRecentLocation(enriched);
      } catch {
        recordRecentLocation(tempLoc);
      }
    },
    [recordRecentLocation]
  );

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeolocationStatus('unsupported');
      setGeolocationMessage(
        'Browser geolocation is not supported on this device. Showing Bengaluru as the default location.'
      );
      return;
    }

    setGeolocationStatus('requesting');
    setGeolocationMessage('Requesting your browser location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeolocationStatus('granted');
        setGeolocationMessage(null);
        const resolved = await reverseLookupApi(latitude, longitude);
        const detected: LocationInfo = {
          id: `geo-browser-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
          name: resolved.name,
          region: resolved.region,
          country: resolved.country,
          latitude: Math.round(latitude * 10000) / 10000,
          longitude: Math.round(longitude * 10000) / 10000,
          source: 'geolocation',
        };
        selectLocation(detected);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setGeolocationStatus('denied');
          setGeolocationMessage(
            'Location permission was denied. Using fallback or selected city—search any city or click the map anytime.'
          );
        } else if (geoError.code === geoError.TIMEOUT) {
          setGeolocationStatus('error');
          setGeolocationMessage(
            'Location detection timed out. Continuing with your selected fallback city.'
          );
        } else {
          setGeolocationStatus('error');
          setGeolocationMessage(
            'Unable to determine device location. Continuing with your selected fallback city.'
          );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, [selectLocation]);

  const loadAirQuality = useCallback(
    async (lat: number, lon: number, forceRefresh = false, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAirQualityData(lat, lon, { signal, forceRefresh });
        setDataset(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to fetch live air quality data right now.';
        setError(message);
        setDataset(null);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAirQuality(location.latitude, location.longitude, false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [location.latitude, location.longitude, loadAirQuality]);

  const refreshAirQuality = useCallback(() => {
    void loadAirQuality(location.latitude, location.longitude, true);
  }, [location.latitude, location.longitude, loadAirQuality]);

  const recommendation = useMemo(
    () => generateRuleBasedRecommendation(dataset, sensitivityGroup, activity),
    [dataset, sensitivityGroup, activity]
  );

  const alerts = useMemo(
    () => evaluateSmartAlerts(dataset, alertThresholds, sensitivityGroup, location.name),
    [dataset, alertThresholds, sensitivityGroup, location.name]
  );

  const updateAlertThresholds = useCallback((next: Partial<AlertThresholds>) => {
    setAlertThresholds((prev) => {
      const updated = { ...prev, ...next };
      saveThresholds(updated);
      return updated;
    });
  }, []);

  const enableBrowserNotifications = useCallback(async () => {
    const permission = await requestBrowserNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      updateAlertThresholds({ browserNotificationsEnabled: true });
      dispatchBrowserNotification(
        `AirWise AI Notifications Active — ${location.name}`,
        'You will receive browser alerts when configured air quality thresholds are exceeded.'
      );
      setNotificationFeedback({
        tone: 'success',
        message: 'Browser notifications are now enabled and active while AirWise AI is open.',
      });
    } else if (permission === 'denied') {
      updateAlertThresholds({ browserNotificationsEnabled: false });
      const embedded = isEmbeddedIframe();
      setNotificationFeedback({
        tone: 'warning',
        message: embedded
          ? 'Browser notifications were blocked by your browser inside this embedded preview frame. In-app smart alert banners remain active, or open the app directly in its own browser tab to allow OS notifications.'
          : 'Browser notifications are blocked in your browser site settings. Click the lock/permissions icon in your address bar to allow notifications, then retry. In-app smart alert banners remain active.',
      });
    } else if (permission === 'unsupported') {
      updateAlertThresholds({ browserNotificationsEnabled: false });
      setNotificationFeedback({
        tone: 'warning',
        message: 'This browser does not support native Web Notifications. In-app smart alert banners remain active.',
      });
    } else {
      updateAlertThresholds({ browserNotificationsEnabled: false });
      setNotificationFeedback({
        tone: 'info',
        message: 'Notification permission prompt was dismissed. Click Enable Browser Notifications to try again.',
      });
    }
  }, [location.name, updateAlertThresholds]);

  // Dispatch browser notification only when alerts cross threshold for a new reading
  useEffect(() => {
    if (
      !alertThresholds.browserNotificationsEnabled ||
      notificationPermission !== 'granted' ||
      alerts.length === 0
    ) {
      return;
    }
    const topAlert = alerts[0];
    const notifyKey = `${location.id}:${topAlert.id}`;
    if (lastNotifiedKeyRef.current === notifyKey) {
      return;
    }
    lastNotifiedKeyRef.current = notifyKey;
    dispatchBrowserNotification(topAlert.title, topAlert.message);
  }, [alerts, alertThresholds.browserNotificationsEnabled, notificationPermission, location.id]);

  const askAiAssistant = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMsg]);
      setAiLoading(true);

      const historyPayload = chatMessages
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text:
            m.role === 'user'
              ? m.text || ''
              : m.structured?.shortAnswer || m.text || '',
        }))
        .filter((m) => m.text.length > 0);

      try {
        const result = await queryAiHealthAssistant({
          question: trimmed,
          locationName: [location.name, location.country].filter(Boolean).join(', '),
          sensitivityGroup,
          activity,
          provider: aiProvider,
          history: historyPayload,
          dataset,
        });

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          structured: result.advice,
          source: result.source,
          model: result.model,
          createdAt: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const fallbackAdvice = buildRuleBasedStructuredAdvice(
          trimmed,
          location.name,
          dataset,
          sensitivityGroup,
          activity
        );
        const errMessage =
          err instanceof ApiClientError
            ? err.message
            : 'AI service is currently unavailable. Showing rule-based guidance instead.';

        const fallbackMsg: ChatMessage = {
          id: `assistant-fallback-${Date.now()}`,
          role: 'assistant',
          structured: fallbackAdvice,
          source: 'rule-engine',
          error: errMessage,
          createdAt: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, fallbackMsg]);
      } finally {
        setAiLoading(false);
      }
    },
    [
      chatMessages,
      location.name,
      location.country,
      sensitivityGroup,
      activity,
      aiProvider,
      dataset,
    ]
  );

  const clearChatHistory = useCallback(() => {
    setChatMessages([]);
  }, []);

  const value: AppContextValue = {
    activeSection,
    setActiveSection,
    location,
    recentLocations,
    selectLocation,
    selectCoordinates,
    requestGeolocation,
    geolocationStatus,
    geolocationMessage,
    dataset,
    loading,
    error,
    refreshAirQuality,
    aqiStandard,
    setAqiStandard,
    theme,
    toggleTheme,
    sensitivityGroup,
    setSensitivityGroup,
    activity,
    setActivity,
    recommendation,
    alertThresholds,
    updateAlertThresholds,
    alerts,
    notificationPermission,
    notificationFeedback,
    inAppAlertsEnabled,
    setInAppAlertsEnabled,
    enableBrowserNotifications,
    aiProvider,
    setAiProvider,
    chatMessages,
    aiLoading,
    askAiAssistant,
    clearChatHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}
