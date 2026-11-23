import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.tsx';
import { clearClientApiCache } from '../../src/services/api.ts';

const sampleDataset = {
  location: {
    latitude: 12.97,
    longitude: 77.59,
    timezone: 'Asia/Kolkata',
    elevationMeters: 920,
  },
  current: {
    usAqi: 88,
    europeanAqi: 42,
    pollutants: {
      pm2_5: 28.5,
      pm10: 46.2,
      ozone: 58.0,
      nitrogenDioxide: 21.3,
      sulfurDioxide: 7.4,
      carbonMonoxide: 420,
    },
    weather: {
      temperatureC: 26.2,
      humidityPercent: 58,
      windSpeedKmh: 10.5,
      weatherCode: 2,
      weatherLabel: 'Partly cloudy',
    },
    observedAt: '2026-11-23T09:00',
  },
  hourlyForecast: [
    {
      time: '2026-11-23T10:00',
      usAqi: 72,
      europeanAqi: 34,
      pm2_5: 22.0,
      pm10: 36.0,
      ozone: 54.0,
      nitrogenDioxide: 18.0,
    },
  ],
  fetchedAt: '2026-11-23T09:00:00.000Z',
  cached: false,
  attribution: {
    airQuality: 'Open-Meteo Air Quality API',
    weather: 'Open-Meteo Weather API',
    note: 'Current readings reflect gridded atmospheric model estimates.',
  },
};

describe('Dashboard Frontend Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearClientApiCache();
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('displays loading state then renders live Bengaluru AQI, pollutants, weather, and recommendations', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    render(<App />);

    expect(screen.getByLabelText('Loading air quality measurements')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('88').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Bengaluru, Karnataka, India/)).toBeInTheDocument();
    expect(screen.getByText('28.5')).toBeInTheDocument();
    expect(screen.getByText('26.2°C')).toBeInTheDocument();
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
    expect(screen.getByText('Personalized Outdoor Guidance')).toBeInTheDocument();
  });

  it('toggles between US EPA AQI and European AQI scales and updates recommendations', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('88').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'EU AQI' }));
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);

    const profileSelect = screen.getByLabelText('Sensitivity Profile');
    await user.selectOptions(profileSelect, 'sensitive');
    expect(screen.getByText('Limit Exposure')).toBeInTheDocument();
  });

  it('renders clear error state with retry action when API fails', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Upstream air quality service unreachable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Live air quality data is currently unavailable')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry Fetch' })).toBeInTheDocument();
  });

  it('supports debounced city search and switches location when selected', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('/api/locations/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 'geo-1850147',
                name: 'Tokyo',
                region: 'Tokyo',
                country: 'Japan',
                latitude: 35.6895,
                longitude: 139.6917,
                timezone: 'Asia/Tokyo',
                source: 'search',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('88').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByLabelText('Search city for air quality');
    await user.type(searchInput, 'Tokyo');

    const tokyoOption = await screen.findByRole('option', { name: /Tokyo/ });
    await user.click(tokyoOption);

    await waitFor(() => {
      expect(screen.getByText(/Tokyo, Tokyo, Japan/)).toBeInTheDocument();
    });
  });

  it('enables browser notifications when granted and shows clear feedback when denied', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(sampleDataset), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    const mockNotificationConstructor = vi.fn();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Object.assign(mockNotificationConstructor, {
        permission: 'default',
        requestPermission: vi.fn(async () => {
          (window.Notification as unknown as { permission: NotificationPermission }).permission =
            'granted';
          return 'granted' as NotificationPermission;
        }),
      }),
    });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('88').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'Smart Alerts' }));

    const enableBtn = screen.getByRole('button', { name: 'Enable Browser Notifications' });
    await user.click(enableBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Browser Notifications: On' })).toBeInTheDocument();
    });
    expect(
      screen.getByText('Browser notifications are now enabled and active while AirWise AI is open.')
    ).toBeInTheDocument();
  });
});
