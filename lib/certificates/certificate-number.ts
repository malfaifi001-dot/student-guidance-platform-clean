function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function generateCertificateNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `CERT-${year}${month}${day}-${random}`;
}

export function generateCertificateBatchNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `CB-${year}${month}${day}-${random}`;
}