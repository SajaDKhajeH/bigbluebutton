import React, { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { SET_AWAY } from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/user-actions/mutations';
import logger from '/imports/startup/client/logger';

const PageVisibilityTracker: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const [setAway] = useMutation(SET_AWAY);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether an away=true was already sent, so away=false is only
  // sent when it actually reverts a previous away state
  const isAwaySentRef = useRef<boolean>(false);
  // Hysteresis: the tab must remain hidden for this long before the user is
  // marked as away, so quick tab switches do not fire away events
  const AWAY_DETECTION_DELAY = 15000; // 15 seconds delay before setting away status

  useEffect(() => {
    // Only track for attendees (not moderators)
    if (!currentUser || currentUser.isModerator || currentUser.role === 'MODERATOR') {
      return;
    }

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;

      if (isHidden) {
        // User switched away from tab - set away after the hysteresis delay.
        // Do not stack timers if one is already pending.
        if (!awayTimeoutRef.current) {
          awayTimeoutRef.current = setTimeout(() => {
            awayTimeoutRef.current = null;
            isAwaySentRef.current = true;
            setAway({ variables: { away: true } })
              .then(() => {
                logger.info({
                  logCode: 'page_visibility_away_set',
                  userId: currentUser.userId,
                }, 'User marked as away due to tab visibility change');
              })
              .catch((error) => {
                // Away state was not applied server-side, allow the next hide to retry
                isAwaySentRef.current = false;
                logger.error({
                  logCode: 'page_visibility_away_error',
                  userId: currentUser.userId,
                  error: error.message,
                }, 'Failed to set away status');
              });
          }, AWAY_DETECTION_DELAY);
        }
      } else {
        // User returned to tab - cancel any pending away detection and only
        // clear the away status if it was previously set
        if (awayTimeoutRef.current) {
          clearTimeout(awayTimeoutRef.current);
          awayTimeoutRef.current = null;
        }

        if (isAwaySentRef.current) {
          isAwaySentRef.current = false;
          setAway({ variables: { away: false } })
            .then(() => {
              logger.info({
                logCode: 'page_visibility_away_cleared',
                userId: currentUser.userId,
              }, 'User marked as active due to tab visibility change');
            })
            .catch((error) => {
              // Server still considers the user away, keep the flag so the
              // next visibility change retries clearing it
              isAwaySentRef.current = true;
              logger.error({
                logCode: 'page_visibility_active_error',
                userId: currentUser.userId,
                error: error.message,
              }, 'Failed to clear away status');
            });
        }
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }
    };
  }, [currentUser, setAway]);

  return null;
};

export default PageVisibilityTracker;
