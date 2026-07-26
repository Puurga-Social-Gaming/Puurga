/** Available alert ringtones (served from `/public/sonneries`). */

export type MessageRingtoneId =
  | 'message'
  | 'nouveau-message'
  | 'vous-avez-un-message'
  | 'message-envoye'
  | 'vibreur-1'
  | 'vibreur-2'
  | 'touche-mobile'
  | 'iphone-touch'
  | 'jingle-sncf';

export interface MessageRingtone {
  id: MessageRingtoneId;
  label: string;
  /** Public path under /sonneries */
  file: string;
  url: string;
}

function ringtoneUrl(file: string): string {
  return `/sonneries/${file}`;
}

export const DEFAULT_MESSAGE_RINGTONE_ID: MessageRingtoneId = 'message';

export const MESSAGE_RINGTONES: MessageRingtone[] = [
  {
    id: 'message',
    label: 'Message',
    file: 'message.wav',
    url: ringtoneUrl('message.wav'),
  },
  {
    id: 'nouveau-message',
    label: 'Nouveau message',
    file: 'nouveau-message.wav',
    url: ringtoneUrl('nouveau-message.wav'),
  },
  {
    id: 'vous-avez-un-message',
    label: 'Vous avez un message',
    file: 'vous-avez-un-message.wav',
    url: ringtoneUrl('vous-avez-un-message.wav'),
  },
  {
    id: 'message-envoye',
    label: 'Message envoyé',
    file: 'message-envoye.wav',
    url: ringtoneUrl('message-envoye.wav'),
  },
  {
    id: 'vibreur-1',
    label: 'Vibreur 1',
    file: 'vibreur-1.wav',
    url: ringtoneUrl('vibreur-1.wav'),
  },
  {
    id: 'vibreur-2',
    label: 'Vibreur 2',
    file: 'vibreur-2.wav',
    url: ringtoneUrl('vibreur-2.wav'),
  },
  {
    id: 'touche-mobile',
    label: 'Touche mobile',
    file: 'touche-mobile.wav',
    url: ringtoneUrl('touche-mobile.wav'),
  },
  {
    id: 'iphone-touch',
    label: 'iPhone touch',
    file: 'iphone-touch.wav',
    url: ringtoneUrl('iphone-touch.wav'),
  },
  {
    id: 'jingle-sncf',
    label: 'Jingle',
    file: 'jingle.wav',
    url: ringtoneUrl('jingle.wav'),
  },
];

export function getMessageRingtone(id: string | null | undefined): MessageRingtone {
  return (
    MESSAGE_RINGTONES.find((r) => r.id === id) ||
    MESSAGE_RINGTONES.find((r) => r.id === DEFAULT_MESSAGE_RINGTONE_ID)!
  );
}
