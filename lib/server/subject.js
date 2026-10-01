import { HttpError } from '@/lib/server/http';

const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const optionalText = (value, max) => value == null || value === '' || (typeof value === 'string' && value.length <= max);

// The person the consultation is about, as the practitioner needs it. Only these
// fields are kept; each is checked, and anything else in the object is dropped.
export function readSubject(subject) {
  if (subject == null) return null;
  const bad = (what) => new HttpError(400, 'invalid_body', `subject.${what} is missing or invalid.`);
  if (typeof subject !== 'object' || Array.isArray(subject)) throw bad('object');
  const { name, dobAd, tob, pob, country, phone, email, dobBs } = subject;
  if (!text(name, 120)) throw bad('name');
  if (typeof dobAd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dobAd)) throw bad('dobAd');
  const born = new Date(`${dobAd}T00:00:00Z`);
  if (Number.isNaN(born.getTime()) || born.toISOString().slice(0, 10) !== dobAd || born > new Date()) throw bad('dobAd');
  if (typeof tob !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(tob)) throw bad('tob');
  if (!text(pob, 120)) throw bad('pob');
  if (!text(country, 80)) throw bad('country');
  if (!optionalText(phone, 30)) throw bad('phone');
  if (!optionalText(email, 200)) throw bad('email');
  const clean = { name: name.trim(), dobAd, tob, pob: pob.trim(), country: country.trim() };
  if (phone) clean.phone = phone.trim();
  if (email) clean.email = email.trim();
  if (dobBs != null) {
    const [year, month, day] = [dobBs.year, dobBs.month, dobBs.day].map(Number);
    if (!(year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 32
      && [year, month, day].every(Number.isInteger))) throw bad('dobBs');
    clean.dobBs = { year, month, day };
  }
  return clean;
}
