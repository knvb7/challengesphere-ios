import { showAppMessage } from './appMessage';

export const showSmallPopup = (message: string) => {
  showAppMessage({
    type: 'info',
    title: message,
    duration: 2400,
  });
};
