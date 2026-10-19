import React, { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { SET_AWAY } from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/user-actions/mutations';
import logger from '/imports/startup/client/logger';

const PageVisibilityTracker: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const [setAway] = useMutation(SET_AWAY);
  const previousVisibilityRef = useRef<boolean>(true);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AWAY_DETECTION_DELAY = 1000; // 1 second delay before setting away status

  useEffect(() => {
    // Only track for attendees (not moderators)
    if (!currentUser || currentUser.isModerator || currentUser.role === 'MODERATOR') {
      return;
    }

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;

      if (isHidden) {
        // User switched away from tab - set away after delay
        if (awayTimeoutRef.current) {
          clearTimeout(awayTimeoutRef.current);
        }

        awayTimeoutRef.current = setTimeout(() => {
          setAway({ variables: { away: true } })
            .then(() => {
              logger.info({
                logCode: 'page_visibility_away_set',
                userId: currentUser.userId,
              }, 'User marked as away due to tab visibility change');
            })
            .catch((error) => {
              logger.error({
                logCode: 'page_visibility_away_error',
                userId: currentUser.userId,
                error: error.message,
              }, 'Failed to set away status');
            });
        }, AWAY_DETECTION_DELAY);
      } else {
        // User returned to tab - clear timeout and set as not away
        if (awayTimeoutRef.current) {
          clearTimeout(awayTimeoutRef.current);
          awayTimeoutRef.current = null;
        }

        setAway({ variables: { away: false } })
          .then(() => {
            logger.info({
              logCode: 'page_visibility_away_cleared',
              userId: currentUser.userId,
            }, 'User marked as active due to tab visibility change');
          })
          .catch((error) => {
            logger.error({
              logCode: 'page_visibility_active_error',
              userId: currentUser.userId,
              error: error.message,
            }, 'Failed to clear away status');
          });
      }

      previousVisibilityRef.current = !isHidden;
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
