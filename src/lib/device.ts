/** A short "기기 · 브라우저" line from a user agent, so a 오류 report says where it happened. */
export function deviceOf(ua: string): string {
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows PC"
          : /Mac/.test(ua)
            ? "Mac"
            : "기타 기기";
  const browser = /KAKAOTALK/i.test(ua)
    ? "카카오톡 인앱"
    : /Instagram/.test(ua)
      ? "인스타그램 인앱"
      : /NAVER/.test(ua)
        ? "네이버 앱"
        : /SamsungBrowser/.test(ua)
          ? "삼성 인터넷"
          : /Edg\//.test(ua)
            ? "Edge"
            : /Chrome|CriOS/.test(ua)
              ? "Chrome"
              : /Safari/.test(ua)
                ? "Safari"
                : /Firefox/.test(ua)
                  ? "Firefox"
                  : "기타 브라우저";
  return `${device} · ${browser}`;
}
