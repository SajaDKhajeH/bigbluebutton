import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Button = styled.button`
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 110%;
  right: 0;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  overflow: hidden;
  z-index: 9999;
  min-width: 130px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
`;

const DropdownItem = styled.button`
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  display: flex;
  gap: 8px;
  align-items: center;

  &:hover {
    background: rgba(255,255,255,0.1);
  }

  ${({ active }) => active && css`
    background: rgba(255,255,255,0.15);
    font-weight: bold;
  `}
`;

export default { Wrapper, Button, Dropdown, DropdownItem };
