import {
  renderBaseEmailLayout,
  renderDetailsGrid,
  renderOtpBox,
  renderAlertBox,
  convertHtmlToPlainText,
  DetailItem,
} from '../baseLayout';
import { DeliveryEmailData, RenderedEmail } from '../types';

/**
 * 3. Delivery Lifecycle Email Templates
 */
export function buildDeliveryStatusEmail(data: DeliveryEmailData): RenderedEmail {
  const trackingUrl = data.trackingUrl || `https://carygoo.com/requests/${data.requestId}`;
  const actionUrl = data.actionUrl || trackingUrl;

  const baseDetails: DetailItem[] = [
    { label: 'Request ID', value: `#${data.requestId.substring(0, 8).toUpperCase()}` },
    { label: 'Route', value: `${data.fromCity} → ${data.toCity}` },
    ...(data.parcelTitle ? [{ label: 'Parcel', value: data.parcelTitle }] : []),
    { label: 'Amount', value: `₹${data.price}`, highlight: true },
    ...(data.expectedDate ? [{ label: 'Expected By', value: data.expectedDate }] : []),
  ];

  let title = 'Delivery Update';
  let badgeText = 'Delivery';
  let badgeVariant: 'primary' | 'success' | 'warning' | 'info' = 'primary';
  let subject = `Delivery Update: ${data.fromCity} → ${data.toCity} [#${data.requestId.substring(0, 8).toUpperCase()}]`;
  let bodyHtml = '';
  let primaryCtaText = 'View Request Details';

  switch (data.status) {
    case 'request_received': {
      title = '📦 New Delivery Request Received!';
      badgeText = 'New Request';
      badgeVariant = 'warning';
      subject = `New Delivery Request: ${data.fromCity} → ${data.toCity} (₹${data.price})`;
      primaryCtaText = 'Review & Accept Request';

      const detailsWithSender: DetailItem[] = [
        ...(data.senderName ? [{ label: 'Sender', value: data.senderName }] : []),
        ...baseDetails,
      ];

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Great news! <strong>${data.senderName || 'A verified sender'}</strong> wants you to carry their parcel along your route from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong>.
        </p>

        ${renderDetailsGrid(detailsWithSender)}

        ${renderAlertBox(
          'Please review the request prompt and accept or decline. Senders appreciate quick responses within 30 minutes.',
          'info',
          '⏱️'
        )}

        <p style="margin: 16px 0; font-size: 14px; color: #475569;">
          Once accepted, you can coordinate pickup timing directly via CaryGoo in-app chat.
        </p>
      `;
      break;
    }

    case 'request_accepted': {
      title = '✅ Request Accepted by Traveller!';
      badgeText = 'Accepted';
      badgeVariant = 'success';
      subject = `Request Accepted! ${data.travellerName || 'Traveller'} will carry your parcel to ${data.toCity}`;
      primaryCtaText = 'Open Chat & Coordinate Pickup';

      const detailsWithTraveller: DetailItem[] = [
        ...(data.travellerName ? [{ label: 'Traveller', value: data.travellerName }] : []),
        ...baseDetails,
      ];

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Fantastic! <strong>${data.travellerName || 'Your traveller'}</strong> has accepted your request to carry your parcel from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong>.
        </p>

        ${renderDetailsGrid(detailsWithTraveller)}

        ${renderAlertBox(
          'The agreed delivery payment is safely reserved in CaryGoo Secure Guarantee. Payout is released to the traveller only after the delivery OTP is verified upon safe handover.',
          'success',
          '🔒'
        )}

        <p style="margin: 16px 0; font-size: 14px; color: #475569;">
          Next step: Open the app chat to agree on the pickup location and time with the traveller.
        </p>
      `;
      break;
    }

    case 'pickup_confirmed': {
      title = '🚗 Parcel Picked Up & In Transit!';
      badgeText = 'In Transit';
      badgeVariant = 'primary';
      subject = `Parcel Picked Up! Your delivery to ${data.toCity} is on the way`;
      primaryCtaText = 'Track Delivery Live';

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Your parcel has been picked up by <strong>${data.travellerName || 'the traveller'}</strong> and is now on its way to <strong>${data.toCity}</strong>!
        </p>

        ${renderDetailsGrid(baseDetails)}

        ${data.deliveryOtp ? `
        <div style="margin: 20px 0;">
          ${renderOtpBox(
            data.deliveryOtp,
            'Share this secret OTP with the recipient. The traveller must enter this code upon delivery to verify handover.'
          )}
        </div>
        ` : ''}

        ${renderAlertBox(
          'Do NOT share your delivery OTP until the parcel is physically in the recipient\'s hands and verified in good condition.',
          'security',
          '🛡️'
        )}
      `;
      break;
    }

    case 'in_transit': {
      title = '📍 Journey Milestone Reached';
      badgeText = 'Trip Update';
      badgeVariant = 'info';
      subject = `Transit Update: Parcel moving from ${data.fromCity} towards ${data.toCity}`;
      primaryCtaText = 'View Live Location';

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Here is a quick progress update on your parcel traveling between <strong>${data.fromCity}</strong> and <strong>${data.toCity}</strong>.
        </p>

        ${renderDetailsGrid(baseDetails)}

        ${renderAlertBox(
          'The traveller has checked in along the corridor route. Expected delivery is progressing smoothly.',
          'info',
          '🗺️'
        )}
      `;
      break;
    }

    case 'delivered': {
      title = '🎉 Delivery Complete!';
      badgeText = 'Completed';
      badgeVariant = 'success';
      subject = `Delivered! Your parcel in ${data.toCity} has been handed over successfully`;
      primaryCtaText = 'Rate Your Experience';

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Great news! The handover for your parcel from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong> has been confirmed with secure delivery OTP verification.
        </p>

        ${renderDetailsGrid(baseDetails)}

        ${renderAlertBox(
          'Thank you for using CaryGoo! Please take 10 seconds to rate your experience and help maintain trust across our community.',
          'success',
          '⭐'
        )}
      `;
      break;
    }

    case 'payout_released': {
      title = '💰 Delivery Payout Released!';
      badgeText = 'Payout Sent';
      badgeVariant = 'success';
      subject = `Payout Released: ₹${data.payoutAmount || data.price} transferred for delivery to ${data.toCity}`;
      primaryCtaText = 'View Wallet & Earnings';

      const payoutDetails: DetailItem[] = [
        { label: 'Delivery Earnings', value: `₹${data.payoutAmount || data.price}`, highlight: true },
        ...baseDetails,
      ];

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Congratulations on a successful delivery! Following verified OTP confirmation, your earnings of <strong>₹${data.payoutAmount || data.price}</strong> have been released to your CaryGoo payout account.
        </p>

        ${renderDetailsGrid(payoutDetails)}

        ${renderAlertBox(
          'Payouts are credited directly to your registered bank account / UPI within standard banking clearance times.',
          'info',
          '🏦'
        )}
      `;
      break;
    }

    case 'request_rejected': {
      title = 'Request Not Accepted';
      badgeText = 'Unavailable';
      badgeVariant = 'warning';
      subject = `Delivery Update: Traveller unavailable for ${data.fromCity} → ${data.toCity}`;
      primaryCtaText = 'Find Another Traveller';

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.recipientName},
        </p>
        <p style="margin: 0 0 16px 0;">
          The traveller for your parcel from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong> was unable to accept your request at this time.
        </p>

        ${renderDetailsGrid(baseDetails)}

        ${renderAlertBox(
          'Don\'t worry! There are multiple active travellers heading along this corridor. Tap below to browse available trips.',
          'info',
          '🔍'
        )}
      `;
      break;
    }
  }

  const html = renderBaseEmailLayout({
    preheader: `${title} - ${data.fromCity} to ${data.toCity} (₹${data.price})`,
    title,
    badge: { text: badgeText, variant: badgeVariant },
    contentHtml: bodyHtml,
    primaryCta: {
      text: primaryCtaText,
      url: actionUrl,
    },
    footerNote: 'Always verify OTP handover inside the CaryGoo app. Support: support@carygoo.com.',
  });

  return {
    subject,
    html,
    text: convertHtmlToPlainText(html),
    category: 'delivery',
  };
}

