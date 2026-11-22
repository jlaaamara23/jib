// Cloudinary serves a resized, compressed copy when the transformation is put after "/upload/".
// Other URLs (e.g. local uploads) are returned unchanged.
export function sizedImage(url, width) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`)
}
