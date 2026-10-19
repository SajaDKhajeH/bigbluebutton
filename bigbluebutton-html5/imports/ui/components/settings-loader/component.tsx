import React, { useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { setMeetingSettings } from '/imports/ui/core/local-states/useMeetingSettings';
import MeetingClientSettings from '/imports/ui/Types/meetingClientSettings';
import { ErrorScreen } from '/imports/ui/components/error-screen/component';
import LoadingScreen from '/imports/ui/components/common/loading-screen/component';
import Session from '/imports/ui/services/storage/in-memory';
import Auth from '/imports/ui/services/auth';
import BBBWeb from '/imports/api/bbb-web-api';
import MeetingStaticDataStore from '/imports/ui/core/singletons/meetingStaticData';
import { MeetingStaticData } from '/imports/ui/Types/meetingStaticData';

const connectionTimeout = 60000;
const FAVICON_ELEMENT_ID = 'bbb-dynamic-favicon';

const ensureFaviconElement = (): HTMLLinkElement => {
  let faviconElement = document.getElementById(FAVICON_ELEMENT_ID) as HTMLLinkElement | null;

  if (!faviconElement) {
    faviconElement = document.createElement('link');
    faviconElement.id = FAVICON_ELEMENT_ID;
    faviconElement.rel = 'icon';
    document.head.appendChild(faviconElement);
  }

  return faviconElement;
};

const updateMeetingFavicon = (
  customLogoUrl?: string | null,
  customDarkLogoUrl?: string | null,
  useDarkLogo = false,
) => {
  const nextFaviconUrl = useDarkLogo && customDarkLogoUrl ? customDarkLogoUrl : customLogoUrl;

  if (!nextFaviconUrl) return;

  const faviconElement = ensureFaviconElement();
  const cacheSeparator = nextFaviconUrl.includes('?') ? '&' : '?';
  faviconElement.href = `${nextFaviconUrl}${cacheSeparator}v=${Date.now()}`;
};

type Meeting = MeetingStaticData & {
  clientSettings: {
    clientSettingsJson: MeetingClientSettings;
  };
};
interface Response {
  meeting: Array<Meeting>;
}

declare global {
  interface Window {
    meetingClientSettings: MeetingClientSettings;
  }
}

interface SettingsLoaderProps {
  children: React.ReactNode;
}

const SettingsLoader: React.FC<SettingsLoaderProps> = (props) => {
  const { children } = props;
  const [settingsFetched, setSettingsFetched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const meetingBrandingRef = React.useRef<{
    customLogoUrl?: string | null;
    customDarkLogoUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    setLoading(true);

    const controller = new AbortController();
    timeoutRef.current = setTimeout(() => {
      controller.abort();
      setError('Timeout fetching client settings');
      setLoading(false);
    }, connectionTimeout);

    const clientSessionUUID = uuid();
    sessionStorage.setItem('clientSessionUUID', clientSessionUUID);

    const sessionToken = Auth.sessionToken as string | null;

    if (!sessionToken) {
      setLoading(false);
      setError('Missing session token');
      return;
    }

    BBBWeb.index(controller.signal)
      .then(({ data }) => {
        const url = new URL(`${data.graphqlApiUrl}/meetingStaticData`);
        fetch(url, {
          method: 'get',
          credentials: 'include',
          headers: {
            'x-session-token': sessionToken ?? '',
          },
          signal: controller.signal,
        })
          .then((resp) => resp.json())
          .then((data: Response) => {
            clearTimeout(timeoutRef.current);
            const {
              clientSettings,
              ...staticData
            } = data?.meeting[0];
            const settings = clientSettings.clientSettingsJson;
            window.meetingClientSettings = JSON.parse(JSON.stringify(settings));
            MeetingStaticDataStore.setMeetingData(staticData);
            meetingBrandingRef.current = {
              customLogoUrl: staticData.customLogoUrl,
              customDarkLogoUrl: staticData.customDarkLogoUrl,
            };
            updateMeetingFavicon(staticData.customLogoUrl, staticData.customDarkLogoUrl);
            setMeetingSettings(settings);
            setLoading(false);
            setSettingsFetched(true);
          }).catch(() => {
            setLoading(false);
            setError('Error fetching client settings');
            Session.setItem('errorMessageDescription', 'meeting_ended');
          });
      }).catch((error) => {
        setLoading(false);
        setError('Error fetching GraphQL URL: '.concat(error.message || ''));
      });
  }, []);

  useEffect(() => {
    const handleDarkModeChange = (event: Event) => {
      const branding = meetingBrandingRef.current;
      if (!branding) return;

      const { detail } = event as CustomEvent<{ enabled: boolean }>;
      updateMeetingFavicon(
        branding.customLogoUrl,
        branding.customDarkLogoUrl,
        detail?.enabled ?? false,
      );
    };

    window.addEventListener('darkmodechange', handleDarkModeChange);

    return () => {
      window.removeEventListener('darkmodechange', handleDarkModeChange);
    };
  }, []);

  return (
    <>
      {settingsFetched ? children : null}
      {error ? (
        <ErrorScreen
          endedReason={error}
        />
      ) : null}
      {loading ? (
        <LoadingScreen />
      ) : null}
    </>
  );
};

export default SettingsLoader;
