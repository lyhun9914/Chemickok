import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkOpener } from "@/components/LinkOpener";
import { josa } from "@/lib/josa";
import { QUIZ_LEN } from "@/lib/quizBank";
import { getDb } from "@/services/server/db";
import { isId } from "@/services/server/funInput";

/** /quiz/{id}: the shared "나를 얼마나 아냥?" link. The preview names whose quiz it is; a visitor goes on to /?quiz={id}. */
export async function generateMetadata({ params }: PageProps<"/quiz/[id]">): Promise<Metadata> {
  const { id } = await params;
  const r = isId(id) ? await getDb()?.quizGet(id).catch(() => null) : null;
  const title = r ? `🐾 ${josa(r.quiz.owner_name, "을/를")} 얼마나 아냥?` : "🐾 나를 얼마나 아냥? · 냥신 점괘";
  const description = r
    ? `${QUIZ_LEN}문제 다 맞히면 찐친 인정이다냥. 링크 눌러서 퀴즈 풀기 👉 순위표도 있다냥!`
    : "친구가 나를 얼마나 아는지 7문제로 알아보는 퀴즈다냥.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images: ["/og.png?v=2"], locale: "ko_KR", type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

async function Open({ params }: { params: PageProps<"/quiz/[id]">["params"] }) {
  const { id } = await params;
  return <LinkOpener to={`/?quiz=${encodeURIComponent(id)}`} label="퀴즈" />;
}

export default function QuizLinkPage({ params }: PageProps<"/quiz/[id]">) {
  return (
    <Suspense>
      <Open params={params} />
    </Suspense>
  );
}
