/**
 * mailService.js - Serwis wysyłki wiadomości e-mail oraz komunikacji z backendem GAS SKN Psychoonkologii.
 */

import { getGasWebAppUrl } from '../utils/storage.js';
import { sendToGAS } from './googleSheets.js';

export const DEFAULT_GAS_MAIL_URL =
  "https://script.google.com/macros/s/AKfycbw989Pzd1qDhRvM6_oRgVZtcVInIw31lgcG-mL_YGJgBRnXTJnSFoUlkH7nMvyeeVge/exec";

export function getMailGasUrl(orgId = 'skn-psychoonkologia') {
  return (
    (typeof window !== 'undefined' ? getGasWebAppUrl(orgId) : null) ||
    import.meta.env?.VITE_GAS_API_URL ||
    import.meta.env?.VITE_GAS_URL ||
    DEFAULT_GAS_MAIL_URL
  );
}

/**
 * Wysłanie e-maila powitalnego lub powiadomienia za pośrednictwem akcji wyślij_mail w GAS.
 */
export async function sendEmailViaGAS({ to, subject, body, templateType = 'welcome', orgId = 'skn-psychoonkologia' }) {
  const payload = {
    action: 'wyslij_mail',
    to,
    subject,
    body,
    templateType,
    orgId,
    timestamp: new Date().toISOString(),
  };

  console.log(`[mailService] Wysyłanie e-maila do ${to} via GAS:`, payload);
  return await sendToGAS(payload);
}

export default {
  DEFAULT_GAS_MAIL_URL,
  getMailGasUrl,
  sendEmailViaGAS,
};
