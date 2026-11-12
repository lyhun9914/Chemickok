import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkOpener } from "@/components/LinkOpener";
import { getDb } from "@/services/server/db";
import { isId } from "@/services/server/funInput";

/** /room/{id}: the shared 단톡방 케미표 link. The preview names the room and how many are in; a visitor goes on to /?room={id}. */
export async function generateMetadata({ params }: PageProps<"/room/[id]">): Promise<Metadata> {
  const { id } = await params;
  const r = isId(id) ? await getDb()?.roomGet(id).catch(() => null) : null;
  const title = r ? `🐾 ${r.room.title} 케미표` : "🐾 단톡방 케미표 · 냥신 점괘";
  const description = r
    ? `생일만 넣으면 우리 방 궁합표가 나온다냥. 지금 ${r.members.length}명 들어왔다냥! 링크 눌러서 나도 넣기 👉`
    : "링크 하나로 단톡방 친구들 궁합표 · 짝꿍 · 앙숙 · 분위기 메이커를 보는 곳이다냥.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images: ["/og.png?v=2"], locale: "ko_KR", type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

async function Open({ params }: { params: PageProps<"/room/[id]">["params"] }) {
  const { id } = await params;
  return <LinkOpener to={`/?room=${encodeURIComponent(id)}`} label="케미표" />;
}

export default function RoomLinkPage({ params }: PageProps<"/room/[id]">) {
  return (
    <Suspense>
      <Open params={params} />
    </Suspense>
  );
}
