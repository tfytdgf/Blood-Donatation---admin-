const dialable = (phone) => phone.replace(/[^\d+]/g, '');

// WhatsApp needs the number with country code and no "+" (donor phones must be stored like +91 98765 43210).
export default function ContactButtons({ phone, message, compact, label }) {
  const text = encodeURIComponent(message);
  const cls = compact ? 'btn btn-sm' : 'btn';
  const who = label ? ` ${label}` : '';
  return (
    <div className="flex flex-wrap gap-2">
      <a className={cls} href={`tel:${dialable(phone)}`} aria-label={`Call${who}`}>Call</a>
      <a className={cls} href={`https://wa.me/${dialable(phone).replace('+', '')}?text=${text}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp${who}`}>
        WhatsApp
      </a>
      <a className={cls} href={`sms:${dialable(phone)}?&body=${text}`} aria-label={`SMS${who}`}>SMS</a>
    </div>
  );
}