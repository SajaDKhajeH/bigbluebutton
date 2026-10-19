import styled from 'styled-components';
import {
  borderSize,
  borderRadius,
  smPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorText,
  colorBorder,
  colorGray,
  colorGrayLighter,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';
import { fontSizeSmall } from '/imports/ui/stylesheets/styled-components/typography';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import Button from '/imports/ui/components/common/button/component';

type urlProps = {
  animations: boolean;
}

type TabProps = {
  isActive: boolean;
}

const UrlError = styled.div<urlProps>`
  color: red;
  padding: 1em 0 1em 0; /* Adjusted padding since button is no longer absolute */

  ${({ animations }) => animations && `
    transition: 1s;
  `}
`;

const ExternalVideoModal = styled(ModalSimple)`
  padding: 1rem;
  min-height: 23rem;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  margin-right: auto;
  margin-left: auto;
  width: 100%;
  height: 100%; /* Ensure optimal usage of modal space */
`;

const VideoUrl = styled.div<urlProps>`
  margin: 0 ${borderSize} 0 ${borderSize};

  & > label {
    display: block;
  }

  & > label input {
    display: block;
    margin: 10px 0 10px 0;
    padding: 0.4em;
    color: ${colorText};
    line-height: 2rem;
    width: 100%;
    font-family: inherit;
    font-weight: inherit;
    border: 1px solid ${colorBorder};
    border-radius: ${borderRadius};

    ${({ animations }) => animations && `
      transition: box-shadow .2s;
    `}

    &:focus {
      outline: none;
      border-radius: ${borderSize};
      box-shadow: 0 0 0 ${borderSize} ${colorPrimary}, inset 0 0 0 1px ${colorPrimary};
    }
  }

  & > span {
    font-weight: 600;
  }
`;

const ExternalVideoNote = styled.div`
  color: ${colorGray};
  font-size: ${fontSizeSmall};
  font-style: italic;
  padding-top: ${smPaddingY};
`;

// @ts-ignore - Button is JSX element
const StartButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin: 0;
  margin-top: auto; /* Pushes the button to the bottom of the container */
  
  &:focus {
    outline: none !important;
  }

  & > i {
    color: #3c5764;
  }
`;

// ==========================================
// Custom Styled Components for Tabs & Lists
// ==========================================

const TabContainer = styled.div`
  display: flex;
  border-bottom: 2px solid ${colorGrayLighter};
  margin-bottom: 1.5rem;
  gap: 0.5rem;
`;

const TabButton = styled.button<TabProps>`
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  background-color: transparent;
  border: none;
  border-bottom: ${({ isActive }) => (isActive ? `3px solid ${colorPrimary}` : '3px solid transparent')};
  color: ${({ isActive }) => (isActive ? colorPrimary : colorGray)};
  font-weight: ${({ isActive }) => (isActive ? 600 : 500)};
  font-size: 1rem;
  transition: all 0.2s ease-in-out;
  outline: none;
  border-top-left-radius: ${borderRadius};
  border-top-right-radius: ${borderRadius};

  &:hover {
    color: ${colorPrimary};
  }
`;

const ListContainer = styled.div`
  min-height: 200px;
  max-height: 350px;
  overflow-y: auto;
  padding: 0.25rem;
  margin-bottom: 1rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${colorGrayLighter};
    border-radius: ${borderRadius};
  }
`;

const ListItem = styled.li`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${colorGrayLighter};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: background-color 0.2s ease;
  border-radius: ${borderRadius};
  font-size: 0.95rem;
  color: ${colorText};

  &:hover {
    background-color: #f8fafc; /* Soft hover effect */
  }
`;

const LoadingText = styled.div`
  text-align: center;
  color: ${colorGray};
  margin-top: 2.5rem;
  font-size: 0.95rem;
`;

export default {
  UrlError,
  ExternalVideoModal,
  Content,
  VideoUrl,
  ExternalVideoNote,
  StartButton,
  TabContainer,
  TabButton,
  ListContainer,
  ListItem,
  LoadingText,
};
