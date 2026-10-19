import React, { useState, useEffect } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useMutation } from '@apollo/client';
import Styled from './styles';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { isUrlValid } from './service';
import { EXTERNAL_VIDEO_START } from '../../mutations';

import Auth from '/imports/ui/services/auth';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';

const intlMessages = defineMessages({
  start: { 
    id: 'app.externalVideo.start', 
    description: 'Share external video'
   },
  urlError: {
     id: 'app.externalVideo.urlError', 
     description: 'Not a video URL error' 
    },
  input: { 
    id: 'app.externalVideo.input', 
    description: 'Video URL' 
  },
  urlInput: { 
    id: 'app.externalVideo.urlInput', 
    description: 'URL input field placeholder' 
  },
  title: { 
    id: 'app.externalVideo.title', 
    description: 'Modal title' 
  },
  close: {
     id: 'app.externalVideo.close',
      description: 'Close' 
    },
  note: { 
    id: 'app.externalVideo.noteLabel',
     description: 'provides hint about Shared External videos'
    },
  loadingTitle: { 
    id: 'app.recording.loadingTitle', 
    description: 'Loading data ...' 
  },
  backLabel: { 
    id: 'app.audio.backLabel', 
    description: 'Return' 
  },
  noItemToShow: { 
    id: 'app.externalVideo.noItemToShow',
     description: 'No item to display', 
     defaultMessage: 'No item to display in this section.'
     },
  teacherTabTitle: { 
    id: 'app.externalVideo.teacherTabTitle', 
    description: 'Teacher tab title',
     defaultMessage: 'Teacher' 
    },
  instituteTabTitle: { 
    id: 'app.externalVideo.instituteTabTitle',
     description: 'Institute tab title', 
     defaultMessage: 'Institute' 
    },
});

const YOUTUBE_SHORTS_REGEX = new RegExp(/^(?:https?:\/\/)?(?:www\.)?(youtube\.com\/shorts)\/.+$/);

const YOUTUBE_REGEX = new RegExp(/^(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu.be)\/.+$/);

interface ExternalVideoPlayerModalProps {
  onRequestClose: () => void;
  priority: string;
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
}

const ExternalVideoPlayerModal: React.FC<ExternalVideoPlayerModalProps> = ({
  isOpen,
  setIsOpen,
  onRequestClose,
  priority,
}) => {
  const intl = useIntl();
  const Settings = getSettingsSingletonInstance();
  // @ts-ignore
  const { animations } = Settings.application;
  
  const meetingId = Auth.meetingID; 
  const currentUser = useCurrentUser();

  const [videoUrl, setVideoUrl] = useState('');
  const [startExternalVideo] = useMutation(EXTERNAL_VIDEO_START);

  const [activeTab, setActiveTab] = useState<'url' | 'teacher' | 'institute'>('url');
  const [items, setItems] = useState<any[]>([]);
  const [folderHistory, setFolderHistory] = useState<any[][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const avatarUrl = currentUser?.data?.avatar;
  let portalUrl = '';
  if (avatarUrl) {
    try {
      const urlObj = new URL(avatarUrl);
      portalUrl = urlObj.searchParams.get('portalUrl') || ''; 
    } catch (e) {}
  }

  const buildTree = (flatData: any[]) => {
    const nodes = flatData.map(item => ({
      id: item.ID,
      name: item.Title,
      url: item.Url ? item.Url.replace(/\\/g, '/') : '',
      isFolder: item.Type === 1,
      fileType: item.FileType,
      fullAddress: item.FullAddress,
      parentDir: item.directories,
      children: [] as any[]
    }));

    const tree: any[] = [];
    const folderMap = new Map();

    nodes.forEach(node => {
      if (node.isFolder && node.fullAddress) {
        const normalizedPath = node.fullAddress.replace(/\\/g, '/').replace(/\/$/, '');
        folderMap.set(normalizedPath, node);
      }
    });

    nodes.forEach(node => {
      if (node.parentDir) {
        const normalizedParent = node.parentDir.replace(/\\/g, '/').replace(/\/$/, '');
        const parentFolder = folderMap.get(normalizedParent);

        if (parentFolder) {
          parentFolder.children.push(node);
        } else {
          tree.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    // Custom sorting function: Folders first, then files
    const sortNodes = (nodeList: any[]) => {
      nodeList.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return 0;
      });

      nodeList.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });

      return nodeList;
    };

    return sortNodes(tree);
  };

  const startWatching = (url: string) => {
    let externalVideoUrl = url;

    if (YOUTUBE_SHORTS_REGEX.test(url)) {
      const shortsUrl = url.replace('shorts/', 'watch?v=');
      externalVideoUrl = shortsUrl;
    }

    if (YOUTUBE_REGEX.test(externalVideoUrl)) {
      const YTUrl = new URL(externalVideoUrl);
      YTUrl.searchParams.delete('list');
      YTUrl.searchParams.delete('index');
      externalVideoUrl = YTUrl.toString();
    }

    startExternalVideo({ variables: { externalVideoUrl } });
  };

  const valid = isUrlValid(videoUrl);

  useEffect(() => {
    if (activeTab === 'url') return;

    let isCancelled = false;
    const abortController = new AbortController();

    const fetchCustomVideos = async () => {
      setIsLoading(true);
      setItems([]);
      setFolderHistory([]);

      if (!portalUrl || !meetingId) {
        setIsLoading(false);
        return;
      }

      try {
        const apiUrl = `${portalUrl}/Api/BBBV3/GetVideos?internalMeetingId=${meetingId}&type=${activeTab}`;
        
        const response = await fetch(apiUrl, { signal: abortController.signal });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!isCancelled) {
          if (data && data.Results) {
            let nestedItems = buildTree(data.Results);
            
            // Bypass the root folder in the teacher tab if it's the only item present
            if (activeTab === 'teacher' && nestedItems.length === 1 && nestedItems[0].isFolder) {
              nestedItems = nestedItems[0].children || [];
            }

            setItems(nestedItems);
          } else {
            setItems([]);
          }
          setIsLoading(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted for tab:', activeTab);
          return;
        }
        
        console.error("Error fetching custom videos:", error);
        if (!isCancelled) {
          setItems([]);
          setIsLoading(false);
        }
      }
    };

    fetchCustomVideos();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [activeTab, portalUrl, meetingId]);

  const handleItemClick = (item: any) => {
    if (item.isFolder) {
      setFolderHistory([...folderHistory, items]);
      setItems(item.children || []);
    } else {
      const safeUrl = encodeURI(item.url);
      startWatching(safeUrl);
      onRequestClose();
    }
  };

  const handleBack = () => {
    if (folderHistory.length > 0) {
      const prevItems = folderHistory[folderHistory.length - 1];
      setItems(prevItems);
      setFolderHistory(folderHistory.slice(0, -1));
    }
  };

  return (
    <Styled.ExternalVideoModal
      onRequestClose={onRequestClose}
      contentLabel={intl.formatMessage(intlMessages.title)}
      title={intl.formatMessage(intlMessages.title)}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      priority={priority}
    >
      <Styled.Content>
        <Styled.TabContainer>
          <Styled.TabButton isActive={activeTab === 'url'} onClick={() => setActiveTab('url')}>
            🌐 {intl.formatMessage(intlMessages.input)}
          </Styled.TabButton>
          {portalUrl && (
            <>
          <Styled.TabButton isActive={activeTab === 'teacher'} onClick={() => setActiveTab('teacher')}>
            🏫 {intl.formatMessage(intlMessages.teacherTabTitle)}
          </Styled.TabButton>
          <Styled.TabButton isActive={activeTab === 'institute'} onClick={() => setActiveTab('institute')}>
            🏢 {intl.formatMessage(intlMessages.instituteTabTitle)}
          </Styled.TabButton>
          </>
          )}
        </Styled.TabContainer>

        {activeTab === 'url' && (
          <>
      <Styled.VideoUrl animations={animations}>
          <label htmlFor="video-modal-input">
            {intl.formatMessage(intlMessages.input)}
            <input
              id="video-modal-input"
              onChange={(e) => setVideoUrl(e.target.value.trim())}
              name="video-modal-input"
              placeholder={intl.formatMessage(intlMessages.urlInput)}
              aria-describedby="exernal-video-note"
              onPaste={(e) => { e.stopPropagation(); }}
              onCut={(e) => { e.stopPropagation(); }}
              onCopy={(e) => { e.stopPropagation(); }}
            />
          </label>
          <Styled.ExternalVideoNote id="external-video-note">
            {intl.formatMessage(intlMessages.note)}
          </Styled.ExternalVideoNote>
        </Styled.VideoUrl>
        <div>
          {
            !valid && videoUrl
              ? (
                <Styled.UrlError animations={animations}>
                  {intl.formatMessage(intlMessages.urlError)}
                </Styled.UrlError>
              )
              : null
          }
        </div>
            <Styled.StartButton
              label={intl.formatMessage(intlMessages.start)}
              disabled={!valid || !videoUrl}
              onClick={() => {
                startWatching(videoUrl);
                onRequestClose();
              }}
              color="primary"
            />
          </>
        )}

        {(activeTab === 'teacher' || activeTab === 'institute') && (
          <Styled.ListContainer>
            {isLoading ? (
              <Styled.LoadingText>{intl.formatMessage(intlMessages.loadingTitle)}</Styled.LoadingText>
            ) : (
              <>
                {folderHistory.length > 0 && (
                  <div onClick={handleBack} style={{ padding: '8px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#f1f1f1', borderRadius: '5px', marginBottom: '15px', display: 'inline-block' }}>
                    🔙 {intl.formatMessage(intlMessages.backLabel)}
                  </div>
                )}
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {items.map((item, index) => (
                    <Styled.ListItem key={item.id || index} onClick={() => handleItemClick(item)}>
                      <span style={{ fontSize: '1.2rem', marginLeft: '10px' }}>
                        {item.isFolder ? '📁' : (item.fileType === 'audio' ? '🎵' : '🎥')}
                      </span>
                      <span style={{ fontWeight: 500 }}>
                        {item.name}
                      </span>
                    </Styled.ListItem>
                  ))}
                  {items.length === 0 && (
                    <Styled.LoadingText>{intl.formatMessage(intlMessages.noItemToShow)}</Styled.LoadingText>
                  )}
                </ul>
              </>
            )}
          </Styled.ListContainer>
        )}
      </Styled.Content>
    </Styled.ExternalVideoModal>
  );
};

export default ExternalVideoPlayerModal;
