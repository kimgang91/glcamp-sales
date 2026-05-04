import Dashboard from "@/components/Dashboard";
import { fetchSalesRows } from "@/lib/sheet";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function Home() {
  let rows: Awaited<ReturnType<typeof fetchSalesRows>> = [];
  let error: string | null = null;
  const updatedAt = new Date().toISOString();

  try {
    rows = await fetchSalesRows();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h1 className="text-lg font-bold">시트를 불러오지 못했습니다</h1>
          <p className="mt-2 text-sm">
            Google Sheets에서 데이터를 가져오는 중 오류가 발생했어요.
            <br />
            스프레드시트 공유 설정이 <b>“링크가 있는 모든 사용자 - 뷰어”</b>로
            되어 있는지 확인해주세요.
          </p>
          <pre className="mt-4 overflow-auto rounded-md bg-white/70 p-3 text-xs text-rose-800">
            {error}
          </pre>
        </div>
      </main>
    );
  }

  return <Dashboard rows={rows} updatedAt={updatedAt} />;
}
