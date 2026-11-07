import {
  renderBaseEmailLayout,
  renderDetailsGrid,
  renderAlertBox,
  convertHtmlToPlainText,
  DetailItem,
} from '../baseLayout';
import {
  ParcelListedEmailData,
  ParcelMatchFoundEmailData,
  ParcelStatusUpdateEmailData,
  RenderedEmail,
} from '../types';

/**
 * 4. Parcel Email Templates
 */

export function buildParcelListedEmail(data: ParcelListedEmailData): RenderedEmail {
  const browseUrl = data.browseMatchesUrl || `https://carygoo.com/parcels/${data.parcelId}/matches`;

  const details: DetailItem[] = [
    { label: 'Parcel ID', value: `#${data.parcelId.substring(0, 8).toUpperCase()}` },
    { label: 'Item Description', value: data.title },
    { label: 'Corridor Route', value: `${data.fromCity} → ${data.toCity}` },
    { label: 'Weight', value: `${data.weightKg} kg` },
    { label: 'Offered Price', value: `₹${data.priceOffered}`, highlight: true },
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Your parcel <strong>"${data.title}"</strong> is now live on CaryGoo! Verified travellers heading from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong> can now view and accept your listing.
    </p>

    ${renderDetailsGrid(details)}

    ${renderAlertBox(
      'Tip: You can also proactively browse verified travellers who have posted upcoming trips on your corridor and send them a direct carry request.',
      'info',
      '💡'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Your parcel "${data.title}" (${data.fromCity} to ${data.toCity}) is now live.`,
    title: 'Parcel Listed Successfully! 📦',
    badge: { text: 'Parcel Listed', variant: 'success' },
    contentHtml,
    primaryCta: {
      text: 'Find Matching Travellers',
      url: browseUrl,
    },
    footerNote: 'Manage or edit your parcel anytime from your CaryGoo dashboard.',
  });

  return {
    subject: `Parcel Listed: "${data.title}" (${data.fromCity} → ${data.toCity})`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'parcel',
  };
}

export function buildParcelMatchFoundEmail(data: ParcelMatchFoundEmailData): RenderedEmail {
  const details: DetailItem[] = [
    { label: 'Your Parcel', value: data.parcelTitle },
    { label: 'Matching Route', value: `${data.fromCity} → ${data.toCity}` },
    { label: 'Traveller', value: data.travellerName },
    { label: 'Travel Date', value: data.travelDate },
    ...(data.transportMode ? [{ label: 'Mode of Travel', value: data.transportMode }] : []),
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Great news! We found a verified traveller heading on your parcel's route from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong>!
    </p>

    ${renderDetailsGrid(details)}

    ${renderAlertBox(
      `<strong>${data.travellerName}</strong> has spare capacity on ${data.travelDate}. Send a carry request early before their luggage capacity fills up!`,
      'success',
      '🎯'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Traveller match found for your parcel to ${data.toCity} with ${data.travellerName}.`,
    title: '🎯 Matching Traveller Found!',
    badge: { text: 'Route Match', variant: 'primary' },
    contentHtml,
    primaryCta: {
      text: 'Send Carry Request',
      url: data.requestMatchUrl,
    },
    footerNote: 'CaryGoo Smart Corridor Matching automatically finds verified travellers for your route.',
  });

  return {
    subject: `Route Match: ${data.travellerName} is travelling from ${data.fromCity} to ${data.toCity}!`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'parcel',
  };
}

export function buildParcelStatusUpdateEmail(data: ParcelStatusUpdateEmailData): RenderedEmail {
  const trackingUrl = data.trackingUrl || `https://carygoo.com/parcels/${data.parcelId}`;

  const details: DetailItem[] = [
    { label: 'Parcel', value: data.parcelTitle },
    { label: 'Parcel ID', value: `#${data.parcelId.substring(0, 8).toUpperCase()}` },
    { label: 'Current Status', value: data.status, highlight: true },
    ...(data.updatedAt ? [{ label: 'Updated At', value: data.updatedAt }] : []),
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      The status of your parcel <strong>"${data.parcelTitle}"</strong> has been updated to: <strong>${data.status}</strong>.
    </p>

    ${renderDetailsGrid(details)}

    <p style="margin: 16px 0; font-size: 14px; color: #475569;">
      ${data.statusDescription}
    </p>
  `;

  const html = renderBaseEmailLayout({
    preheader: `Status update for parcel "${data.parcelTitle}": ${data.status}`,
    title: `Parcel Status: ${data.status}`,
    badge: { text: 'Status Update', variant: 'info' },
    contentHtml,
    primaryCta: {
      text: 'View Parcel Status',
      url: trackingUrl,
    },
  });

  return {
    subject: `Status Update: "${data.parcelTitle}" is now ${data.status}`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'parcel',
  };
}

