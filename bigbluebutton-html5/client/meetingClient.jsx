/*
    BigBlueButton open source conferencing system - http://www.bigbluebutton.org/

    Copyright (c) 2020 BigBlueButton Inc. and by respective authors (see below).

    This program is free software; you can redistribute it and/or modify it under the
    terms of the GNU Lesser General Public License as published by the Free Software
    Foundation; either version 3.0 of the License, or (at your option) any later
    version.

    BigBlueButton is distributed in the hope that it will be useful, but WITHOUT ANY
    WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
    PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License along
    with BigBlueButton; if not, see <http://www.gnu.org/licenses/>.
*/
/* eslint no-unused-vars: 0 */

import React, { useContext, useEffect } from 'react';
import logger from '/imports/startup/client/logger';
import '/imports/ui/services/mobile-app';
import Base from '/imports/startup/client/base';
import ContextProviders from '/imports/ui/components/context-providers/component';
// The adapter import is "unused" as far as static code is concerned, but it
// needs to here to override global prototypes. So: don't remove it - prlanzarin 25 Apr 2022
import adapter from 'webrtc-adapter';

import { LoadingContext } from '/imports/ui/components/common/loading-screen/loading-screen-HOC/component';
import IntlAdapter from '/imports/startup/client/intlAdapter';
import PresenceAdapter from '../imports/ui/components/presence-adapter/component';
// import CustomUsersSettings from '/imports/ui/components/join-handler/custom-users-settings/component';
import createUseSubscription from '/imports/ui/core/hooks/createUseSubscription';
import PageVisibilityTracker from '/imports/ui/components/page-visibility-tracker';
import PLUGIN_CONFIGURATION_QUERY from '/imports/ui/components/plugins-engine/query';

import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import Auth from '/imports/ui/services/auth';

const PortalIntegration = ({ children }) => {
    const { data: currentUser } = useCurrentUser();
    const { data: currentMeeting } = useMeeting();

    useEffect(() => {
        if (!currentUser || !currentMeeting || window._portalApiCalled) return;

        if (currentUser.role === 'MODERATOR') {
            const avatarString = currentUser.avatar;
            const meetingId = Auth.meetingID;

            if (!avatarString || !avatarString.startsWith('http') || !avatarString.includes('portalUrl')) return;

            try {
                const urlObj = new URL(avatarString);
                const portalBaseUrl = urlObj.searchParams.get('portalUrl');

                if (portalBaseUrl) {
                    window._portalApiCalled = true;

                }
            } catch (error) {
                logger.error({ logCode: 'portal_api_parse_error' },
                    `Failed to parse avatar URL for custom data: ${error.message}`);
            }
        }
    }, [currentUser, currentMeeting]);

    return <>{children}</>;
};

const CustomCookiesIntegration = () => {
    const { data: currentUser } = useCurrentUser();

    useEffect(() => {
        if (!currentUser || window._customCookieSet) return;

        const avatarString = currentUser.avatar;

        if (!avatarString || !avatarString.startsWith('http') || !avatarString.includes('customCookies')) return;

        try {
            const urlObj = new URL(avatarString);
            const customCookiesParam = urlObj.searchParams.get('customCookies');

            if (customCookiesParam) {
                // Safely URL decode before parsing JSON
                const decodedTokens = decodeURIComponent(customCookiesParam);
                const tokens = JSON.parse(decodedTokens);

                // Iterate through key-value pairs and set cookies
                if (tokens && typeof tokens === 'object') {
                    Object.entries(tokens).forEach(([key, value]) => {
                        const cookieName = `bbb_custom_${key}`;
                        const cookieValue = encodeURIComponent(String(value));
                        // Short session expiration (expires when browser session ends)
                        document.cookie = `${cookieName}=${cookieValue}; path=/; SameSite=Lax; Secure`;
                    });
                    window._customCookieSet = true;
                }
            }
        } catch (error) {
            logger.error({ logCode: 'custom_tokens_parse_error' },
                `Failed to parse avatar URL for customCookies: ${error.message}`);
        }
    }, [currentUser]);

    return null;
};

const CustomScriptsIntegration = () => {
    const { data: currentUser } = useCurrentUser();

    useEffect(() => {
        if (!currentUser || window._customScriptsLoaded) return;

        const avatarString = currentUser.avatar;

        if (!avatarString || !avatarString.startsWith('http') || !avatarString.includes('customScripts')) return;

        try {
            const urlObj = new URL(avatarString);
            const customScriptsParam = urlObj.searchParams.get('customScripts');

            if (customScriptsParam) {
                // Safely URL decode before parsing
                const decodedScripts = decodeURIComponent(customScriptsParam);
                let scriptUrls = [];

                // Try to parse as JSON array first, fallback to comma-separated string
                try {
                    const parsed = JSON.parse(decodedScripts);
                    if (Array.isArray(parsed)) {
                        scriptUrls = parsed;
                    }
                } catch {
                    // Not a JSON array, treat as comma-separated string
                    scriptUrls = decodedScripts.split(',').map((url) => url.trim());
                }

                // Filter valid HTTP/HTTPS URLs
                scriptUrls = scriptUrls.filter(
                    (url) => url.startsWith('http://') || url.startsWith('https://')
                );

                if (scriptUrls.length > 0) {
                    window._customScriptsLoaded = true;

                    scriptUrls.forEach((src) => {
                        const script = document.createElement('script');
                        script.src = src;
                        // dynamic scripts default to async; async=false keeps execution order
                        script.async = false;
                        script.onload = () => logger.info(
                            { logCode: 'custom_script_loaded' },
                            `Loaded script: ${src}`,
                        );
                        script.onerror = () => logger.error(
                            { logCode: 'custom_script_load_error' },
                            `Failed to load script: ${src}`,
                        );
                        document.head.appendChild(script);
                    });
                }
            }
        } catch (error) {
            logger.error({ logCode: 'custom_scripts_parse_error' },
                `Failed to parse avatar URL for customScripts: ${error.message}`);
        }
    }, [currentUser]);

    return null;
};

// eslint-disable-next-line import/prefer-default-export
const Startup = () => {
    const loadingContextInfo = useContext(LoadingContext);

    useEffect(() => {
        loadingContextInfo.setLoading(false);
    }, []);

    // Logs all uncaught exceptions to the client logger
    window.addEventListener('error', (e) => {
        let message = e.message || e.error?.toString() || 'Unknown error';

        // Chrome will add on "Uncaught" to the start of the message for some reason. This
        // will strip that so the errors can hopefully be grouped better.
        if (message) message = message.replace(/^Uncaught/, '').trim();

        let stack = e.error?.stack || '';

        // Checks if stack includes the message, if not add the two together.
        if (!stack.includes(message)) {
            stack = `${message}\n${stack}`;
        }
        logger.error({
            logCode: 'startup_error',
            extraInfo: {
                stackTrace: stack,
            },
        }, message);
    });

    const { data: pluginConfig } = createUseSubscription(
        PLUGIN_CONFIGURATION_QUERY,
    )((obj) => obj);

    return (
        <ContextProviders>
            <PresenceAdapter>
                <IntlAdapter>
                    <PageVisibilityTracker />
                    <CustomCookiesIntegration />
                    <CustomScriptsIntegration />
                    <Base pluginConfig={pluginConfig} />
                </IntlAdapter>
            </PresenceAdapter>
        </ContextProviders>
    );
};

export default Startup;
