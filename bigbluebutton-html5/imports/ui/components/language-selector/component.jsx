import React, { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import { formatLocaleCode } from '/imports/utils/string-utils';
import { setUseCurrentLocale } from '../../core/local-states/useCurrentLocale';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';

const LANGUAGES = [
  { code: 'fa-IR', label: 'فارسی', flag: '🇮🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const intlMessages = defineMessages({
  language: {
    id: 'app.submenu.application.languageOptionLabel',
    defaultMessage: 'Language',
  },
});

const LanguageSelector = () => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const settings = getSettingsSingletonInstance();

  const language = settings.application.locale;

  const handleSelect = (code) => {
    const newLanguage = code;
    setUseCurrentLocale(newLanguage);
    document.body.classList.remove(`lang-${language}`);
    setOpen(false);
  };

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[1];

  return (
    <Styled.Wrapper>
      <Styled.Button
        onClick={() => setOpen(!open)}
        title={intl.formatMessage(intlMessages.language)}
        aria-label={intl.formatMessage(intlMessages.language)}
      >
        {current.flag} {current.label}
      </Styled.Button>

      {open && (
        <Styled.Dropdown>
          {LANGUAGES.map(lang => (
            <Styled.DropdownItem
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              active={lang.code === language}
            >
              {lang.flag} {lang.label}
            </Styled.DropdownItem>
          ))}
        </Styled.Dropdown>
      )}
    </Styled.Wrapper>
  );
};

export default LanguageSelector;
