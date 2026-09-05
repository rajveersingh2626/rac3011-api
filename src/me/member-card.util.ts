const DISTRICT_CODE = '3011';

function clubCode(clubShortName: string | null, clubName: string): string {
  const source = clubShortName ?? clubName;
  const letters = source
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  return (letters || 'RAC').slice(0, 4);
}

function stableFourDigits(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i += 1) {
    hash = (hash * 31 + memberId.charCodeAt(i)) % 10000;
  }
  return String(hash).padStart(4, '0');
}

export function buildCardId(
  memberId: string,
  clubShortName: string | null,
  clubName: string,
): string {
  return `${DISTRICT_CODE}-${clubCode(clubShortName, clubName)}-${stableFourDigits(memberId)}`;
}
